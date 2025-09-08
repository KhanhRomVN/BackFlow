import { RouteObject } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import HomePage from '../pages/Home'
import EditorPage from '../pages/Editor'
import NotFoundPage from '../pages/Other/NotFoundPage'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <HomePage />
      },
      {
        path: 'editor',
        element: <EditorPage />
      }
    ]
  },
  {
    path: '*',
    element: <NotFoundPage />
  }
]
