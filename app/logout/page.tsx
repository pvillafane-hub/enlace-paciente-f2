import { logout } from './actions'

export default function LogoutPage() {
  return (
    <form action={logout} className="flex justify-center mt-20">
      <button
        type="submit"
        className="bg-red-600 text-white px-6 py-4 rounded-xl text-xl font-semibold hover:bg-red-700 transition"
      >
        Cerrando sesión…
      </button>
    </form>
  )
}
