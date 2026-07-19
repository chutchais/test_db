import { prisma } from '@/lib/prisma'
// import type { User } from '@prisma/client'

// Server Action to add a user quickly for testing
async function addUser(formData: FormData) {
  'use server'
  const email = formData.get('email') as string
  const name = formData.get('name') as string

  if (email) {
    await prisma.user.create({
      data: { email, name },
    })
  }
}

export default async function Home() {
  // Fetch users directly inside the Server Component
  const users: User[] = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return (
    <main className="p-8 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Supabase + Prisma + Next.js</h1>
      
      {/* Form to insert new record */}
      <form action={addUser} className="flex flex-col gap-3 p-4 border rounded">
        <input type="text" name="name" placeholder="Name" className="p-2 border rounded text-black" />
        <input type="email" name="email" placeholder="Email" required className="p-2 border rounded text-black" />
        <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
          Add User
        </button>
      </form>

      {/* Render records lists */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">User List</h2>
        {users.length === 0 ? (
          <p className="text-gray-500">No users found.</p>
        ) : (
          <ul className="divide-y border rounded p-4">
            {users.map((user) => (
              <li key={user.id} className="py-2 flex justify-between">
                <span>{user.name || 'No Name'}</span>
                <span className="text-gray-400">{user.email}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
