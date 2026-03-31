"use client"

import { useState } from "react"

interface User {
  id: string
  fullName: string
  email: string
  role: string
}

export default function UsersSearch({ users }: { users: User[] }) {

  const [query, setQuery] = useState("")

  const filteredUsers = users.filter(user =>
    user.fullName.toLowerCase().includes(query.toLowerCase()) ||
    user.email.toLowerCase().includes(query.toLowerCase()) ||
    user.role.toLowerCase().includes(query.toLowerCase())
  )

  return (

    <div className="space-y-6">

      {/* SEARCH */}
      <input
        type="text"
        placeholder="Buscar usuario por nombre, email o rol..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full border rounded-lg px-4 py-3 text-lg"
      />

      {/* USERS LIST */}
      <div className="bg-white border rounded-xl divide-y">

        {filteredUsers.length === 0 && (
          <div className="p-6 text-gray-500 text-center">
            No se encontraron usuarios
          </div>
        )}

        {filteredUsers.map(user => (
          <div key={user.id} className="p-4 flex justify-between items-center">

            <div>
              <p className="font-semibold">{user.fullName}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>

            <span className="text-sm px-3 py-1 rounded-full bg-gray-100">
              {user.role}
            </span>

          </div>
        ))}

      </div>

    </div>
  )
}