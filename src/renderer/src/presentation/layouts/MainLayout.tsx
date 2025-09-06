import { Outlet } from 'react-router-dom'
import { Sidebar } from '../../components/Sidebar/MainSidebar'
import MainNavbar from '../../components/common/MainNavbar'

const MainLayout = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 pl-72 flex flex-col min-h-screen h-screen">
        <MainNavbar />
        <div className="flex-1 overflow-y-auto min-h-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default MainLayout
