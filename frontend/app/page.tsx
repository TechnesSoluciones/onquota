export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between text-sm">
        <h1 className="text-4xl font-bold text-center mb-4">
          Welcome to OnQuota
        </h1>
        <p className="text-center text-gray-600">
          Multi-tenant SaaS for Sales Team Management
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <a
            href="/login"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Login
          </a>
          <a
            href="/register"
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Register
          </a>
        </div>
      </div>
    </main>
  )
}
