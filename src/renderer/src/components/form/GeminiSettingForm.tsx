import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { GeminiService } from '../../service/GeminiService'
import { CheckCircle, Loader2, XCircle, Trash2, Edit2, Save, RefreshCw } from 'lucide-react' // bạn có thể dùng bất kỳ icon nào hoặc Heroicons

interface GeminiSettingProps {
  onSettingsSaved: () => void
  onCancel: () => void
}
interface ApiKeyEntry {
  key: string
  gmail: string
  isValid?: boolean
  checkStatus?: 'idle' | 'checking' | 'success' | 'error'
}
type ApiKeyErrorType = 'invalid' | 'duplicate_gmail' | 'duplicate_key' | null

export function GeminiSetting({ onSettingsSaved, onCancel }: GeminiSettingProps) {
  const [apiKeys, setApiKeys] = useState<ApiKeyEntry[]>([])
  const [newApiKey, setNewApiKey] = useState('')
  const [newGmail, setNewGmail] = useState('')
  const [isTestingApiKey, setIsTestingApiKey] = useState(false)
  const [apiKeyError, setApiKeyError] = useState<{
    type: ApiKeyErrorType
    message: string
  }>({ type: null, message: '' })

  // Inline edit: track key, field ('key' or 'gmail'), new value, saving state
  const [editingCell, setEditingCell] = useState<{
    row: number
    field: 'key' | 'gmail'
    value: string
    saving?: boolean
    error?: string
    touched?: boolean
  } | null>(null)

  // Load saved settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await GeminiService.getSettings()
        if (settings) {
          setApiKeys([
            {
              key: settings.apiKey,
              gmail: settings.gmail || '',
              isValid: true,
              checkStatus: 'idle'
            }
          ])
        }
      } catch (error) {
        console.error('[GeminiSetting] Error loading settings:', error)
      }
    }
    loadSettings()
  }, [])

  // Add new API key flow
  const handleTestApiKey = async () => {
    if (!newApiKey || !newGmail) return
    const duplicateGmail = apiKeys.find((key) => key.gmail.toLowerCase() === newGmail.toLowerCase())
    if (duplicateGmail) {
      setApiKeyError({
        type: 'duplicate_gmail',
        message: 'Gmail này đã được sử dụng'
      })
      return
    }
    const duplicateKey = apiKeys.find((key) => key.key === newApiKey)
    if (duplicateKey) {
      setApiKeyError({
        type: 'duplicate_key',
        message: 'API key này đã được thêm'
      })
      return
    }
    setIsTestingApiKey(true)
    try {
      await GeminiService.setSettings({
        apiKey: newApiKey,
        gmail: newGmail,
        model: 'gemini-2.0-flash'
      })
      const testResult = await GeminiService.testConnection()
      if (testResult) {
        setApiKeys([
          ...apiKeys,
          {
            key: newApiKey,
            gmail: newGmail,
            isValid: true,
            checkStatus: 'success'
          }
        ])
        setNewApiKey('')
        setNewGmail('')
        setApiKeyError({ type: null, message: '' })
      } else {
        setApiKeyError({
          type: 'invalid',
          message: 'API key không hợp lệ'
        })
      }
    } catch (error) {
      setApiKeyError({
        type: 'invalid',
        message: 'Không thể kiểm tra API key'
      })
    }
    setIsTestingApiKey(false)
  }

  const handleRemoveApiKey = async (index: number) => {
    const keyToRemove = apiKeys[index]
    await GeminiService.removeApiKey(keyToRemove.key)
    setApiKeys(apiKeys.filter((_, i) => i !== index))
  }

  // Save all keys to service
  const handleSettingsSubmit = async () => {
    if (apiKeys.length === 0) return
    try {
      for (const { key, gmail } of apiKeys) {
        await GeminiService.addApiKey(key, gmail)
      }
      onSettingsSaved()
    } catch (error) {
      console.error('[GeminiSetting] Error saving settings:', error)
    }
  }

  // Inline edit save
  const handleInlineSave = async () => {
    if (!editingCell) return
    let errorMsg = ''
    // Basic validation
    if (!editingCell.value.trim()) {
      errorMsg = editingCell.field === 'gmail' ? 'Gmail không được rỗng' : 'API key không được rỗng'
    }
    // Duplicate check
    else if (
      apiKeys.find(
        (k, i) =>
          i !== editingCell.row &&
          (editingCell.field === 'gmail'
            ? k.gmail.toLowerCase() === editingCell.value.toLowerCase()
            : k.key === editingCell.value)
      )
    ) {
      errorMsg =
        editingCell.field === 'gmail' ? 'Gmail này đã được sử dụng' : 'API key này đã được thêm'
    }
    if (errorMsg) {
      setEditingCell({ ...editingCell, error: errorMsg, touched: true })
      return
    }
    // Test chức năng với field là key hay gmail?
    setEditingCell((ec) => ec && { ...ec, saving: true, error: '' })
    try {
      // Cập nhật tạm... (không update Supabase/backend, chỉ sửa local UI)
      setApiKeys((keys) =>
        keys.map((item, idx) =>
          idx === editingCell.row
            ? {
                ...item,
                [editingCell.field]: editingCell.value,
                isValid: undefined,
                checkStatus: 'checking'
              }
            : item
        )
      )
      // Gửi lên server test nếu là key, hoặc test lại key mới với gmail vừa đổi
      const updated = {
        key: editingCell.field === 'key' ? editingCell.value : apiKeys[editingCell.row].key,
        gmail: editingCell.field === 'gmail' ? editingCell.value : apiKeys[editingCell.row].gmail,
        model: 'gemini-2.0-flash'
      }
      await GeminiService.setSettings({
        apiKey: updated.key,
        gmail: updated.gmail,
        model: 'gemini-2.0-flash'
      })
      const testResult = await GeminiService.testConnection()
      setApiKeys((keys) =>
        keys.map((item, idx) =>
          idx === editingCell.row
            ? {
                ...item,
                [editingCell.field]: editingCell.value,
                isValid: testResult,
                checkStatus: testResult ? 'success' : 'error'
              }
            : item
        )
      )
      setEditingCell(null)
    } catch {
      setEditingCell({
        ...editingCell,
        error: 'Không thể kiểm tra',
        saving: false,
        touched: true
      })
      setApiKeys((keys) =>
        keys.map((item, idx) =>
          idx === editingCell.row ? { ...item, checkStatus: 'error', isValid: false } : item
        )
      )
    }
  }

  // Cell click-to-edit handler
  const handleCellEdit = (row: number, field: 'key' | 'gmail', value: string) => {
    setEditingCell({ row, field, value, saving: false })
  }

  // Manual CHECK (icon refresh)
  const handleManualCheck = async (row: number) => {
    setApiKeys((keys) =>
      keys.map((item, idx) => (idx === row ? { ...item, checkStatus: 'checking' } : item))
    )
    try {
      await GeminiService.setSettings({
        apiKey: apiKeys[row].key,
        gmail: apiKeys[row].gmail,
        model: 'gemini-2.0-flash'
      })
      const testResult = await GeminiService.testConnection()
      setApiKeys((keys) =>
        keys.map((item, idx) =>
          idx === row
            ? {
                ...item,
                isValid: testResult,
                checkStatus: testResult ? 'success' : 'error'
              }
            : item
        )
      )
    } catch {
      setApiKeys((keys) =>
        keys.map((item, idx) =>
          idx === row
            ? {
                ...item,
                isValid: false,
                checkStatus: 'error'
              }
            : item
        )
      )
    }
  }

  return (
    <div className="space-y-4 p-4 border border-[#52aaa5]/20 rounded-lg animate-fadeInUp">
      <h3 className="font-medium text-[#2D3748] mb-2">Cài đặt Gemini AI</h3>
      <div className="space-y-4">
        {/* Table: API KEY LIST */}
        {apiKeys.length > 0 && (
          <div className="border border-[#52aaa5]/20 rounded-lg">
            <div className="overflow-x-auto rounded-lg border border-[#52aaa5]/10">
              <table className="min-w-full text-sm">
                <thead className="border-b border-[#52aaa5]/20 rounded-lg">
                  <tr className="text-[#2D3748]">
                    <th className="px-2 py-2 text-left font-semibold">STT</th>
                    <th className="px-2 py-2 text-left font-semibold">Email</th>
                    <th className="px-2 py-2 text-left font-semibold">API</th>
                    <th className="px-2 py-2 text-center font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((item, idx) => (
                    <tr key={idx} className="border-b last:border-b-0 ">
                      {/* STT */}
                      <td className="px-2 py-2 text-black">{idx + 1}</td>

                      {/* Email (Editable Cell) */}
                      <td className="px-2 py-2 min-w-[180px] text-black">
                        {editingCell?.row === idx && editingCell.field === 'gmail' ? (
                          <div className="flex gap-1 items-center">
                            <Input
                              autoFocus
                              value={editingCell.value}
                              onChange={(e) =>
                                setEditingCell(
                                  editingCell
                                    ? {
                                        ...editingCell,
                                        value: e.target.value,
                                        touched: true
                                      }
                                    : null
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineSave()
                                if (e.key === 'Escape') setEditingCell(null)
                              }}
                              className="h-7 text-xs"
                              disabled={editingCell.saving}
                            />
                            <button
                              onClick={handleInlineSave}
                              disabled={editingCell.saving}
                              title="Lưu"
                            >
                              <Save
                                className={`w-5 h-5 ${
                                  editingCell.error
                                    ? 'text-red-500'
                                    : editingCell.saving
                                      ? 'text-yellow-500 animate-spin'
                                      : 'text-green-500'
                                }`}
                              />
                            </button>
                            <button
                              onClick={() => setEditingCell(null)}
                              className="ml-1"
                              title="Huỷ"
                            >
                              <XCircle className="text-gray-500 w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => handleCellEdit(idx, 'gmail', item.gmail)}
                            className="cursor-pointer group relative inline-flex items-center"
                          >
                            <span className="group-hover:underline">{item.gmail}</span>
                            <Edit2
                              className="ml-1 w-4 h-4 opacity-0 group-hover:opacity-100 text-[#52aaa5] transition"
                              aria-label="Edit email"
                            />
                          </div>
                        )}
                        {/* error */}
                        {editingCell?.row === idx &&
                          editingCell.field === 'gmail' &&
                          editingCell.error && (
                            <span className="block text-xs text-red-500">{editingCell.error}</span>
                          )}
                      </td>

                      {/* KEY (Editable Cell) */}
                      <td className="px-2 py-2 min-w-[180px] text-black">
                        {editingCell?.row === idx && editingCell.field === 'key' ? (
                          <div className="flex gap-1 items-center">
                            <Input
                              autoFocus
                              value={editingCell.value}
                              onChange={(e) =>
                                setEditingCell(
                                  editingCell
                                    ? {
                                        ...editingCell,
                                        value: e.target.value,
                                        touched: true
                                      }
                                    : null
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineSave()
                                if (e.key === 'Escape') setEditingCell(null)
                              }}
                              className="h-7 text-xs"
                              disabled={editingCell.saving}
                            />
                            <button onClick={handleInlineSave} disabled={editingCell.saving}>
                              <Save
                                className={`w-5 h-5 ${
                                  editingCell.error
                                    ? 'text-red-500'
                                    : editingCell.saving
                                      ? 'text-yellow-500 animate-spin'
                                      : 'text-green-500'
                                }`}
                              />
                            </button>
                            <button onClick={() => setEditingCell(null)} className="ml-1">
                              <XCircle className="text-gray-500 w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => handleCellEdit(idx, 'key', item.key)}
                            className="cursor-pointer group relative inline-flex items-center"
                          >
                            <span className="group-hover:underline">
                              {item.key.slice(0, 14)}...
                            </span>
                            <Edit2
                              className="ml-1 w-4 h-4 opacity-0 group-hover:opacity-100 text-[#52aaa5] transition"
                              aria-label="Edit key"
                            />
                          </div>
                        )}
                        {editingCell?.row === idx &&
                          editingCell.field === 'key' &&
                          editingCell.error && (
                            <span className="block text-xs text-red-500">{editingCell.error}</span>
                          )}
                      </td>

                      {/* ACTIONS */}
                      <td className="px-2 py-2 flex gap-2 justify-center items-center">
                        {/* Manual check */}
                        <button
                          title="Kiểm tra API Key"
                          onClick={() => handleManualCheck(idx)}
                          className="p-1 hover:bg-gray-200 rounded-full transition"
                        >
                          {item.checkStatus === 'checking' ? (
                            <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />
                          ) : item.checkStatus === 'success' ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : item.checkStatus === 'error' ? (
                            <XCircle className="w-5 h-5 text-red-500" />
                          ) : (
                            <RefreshCw className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                        {/* Remove */}
                        <button
                          title="Xóa"
                          onClick={() => handleRemoveApiKey(idx)}
                          className="p-1 hover:bg-red-50 rounded-full transition"
                        >
                          <Trash2 className="w-5 h-5 text-red-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add NEW KEY */}
        <div className="space-y-2">
          <Label className="text-black">Thêm API Key mới</Label>
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-2 items-start">
              <Input
                value={newGmail}
                onChange={(e) => setNewGmail(e.target.value)}
                placeholder="Gmail của bạn..."
                className={`max-w-xs bg-transparent text-[#2D3748] ${
                  apiKeyError.type === 'duplicate_gmail' ? 'border-red-500' : ''
                }`}
                disabled={isTestingApiKey}
              />
              <Input
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder="API Key của bạn..."
                className={`max-w-xs bg-transparent text-[#2D3748] ${
                  apiKeyError.type === 'duplicate_key' || apiKeyError.type === 'invalid'
                    ? 'border-red-500'
                    : ''
                }`}
                disabled={isTestingApiKey}
              />
              <Button
                type="button"
                onClick={handleTestApiKey}
                disabled={!newApiKey || !newGmail || isTestingApiKey}
                className={`whitespace-nowrap shadow font-semibold ${
                  isTestingApiKey
                    ? 'bg-[#52aaa5]/50 cursor-not-allowed'
                    : apiKeyError.type
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-[#52aaa5] hover:bg-[#319c93] active:scale-95 active:bg-[#319c93]/80'
                }`}
              >
                {isTestingApiKey ? 'Đang kiểm tra...' : 'Thêm'}
              </Button>
            </div>
            {(apiKeyError.type === 'duplicate_gmail' ||
              apiKeyError.type === 'duplicate_key' ||
              apiKeyError.type === 'invalid') && (
              <p className="text-xs text-red-500">{apiKeyError.message}</p>
            )}
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            onClick={onCancel}
            variant="ghost"
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:bg-gray-200 active:scale-95 transition-all duration-150"
          >
            Huỷ
          </Button>
          <Button
            type="button"
            onClick={handleSettingsSubmit}
            disabled={apiKeys.length === 0}
            className="bg-[#52aaa5] hover:bg-[#319c93] text-white font-semibold shadow active:scale-95 active:opacity-80 transition-all duration-150"
          >
            Lưu cài đặt
          </Button>
        </div>
      </div>
    </div>
  )
}
