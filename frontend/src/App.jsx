import React from 'react'

import Signup from './Pages/Signup'
import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './Pages/Login'
import Chat from './Pages/Chat'

const App = () => {
  return (
    <Routes>
      <Route path='/login' element={<Login />} />
      <Route path='/signup' element={<Signup />} />
      <Route path='/chat' element={<Chat />} />
      <Route path='*' element={<Navigate to='/signup' replace />} />
    </Routes>
  )
}

export default App

