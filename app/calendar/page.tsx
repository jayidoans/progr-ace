"use client";
import Image from "next/image";
import Link from "next/link";

export default function Calendar() {
  return (
    <div className="min-h-screen flex flex-col font-[family-name:var(--font-geist-sans)]">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0 flex items-center">
              <Image
                src="/logo.png"
                alt="Application Logo"
                width={40}
                height={40}
                className="h-10 w-auto"
              />
            </div>
            <div className="hidden sm:flex sm:space-x-8">
              <Link href="/" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                Home
              </Link>
              <Link href="/calendar" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                Training Calendar
              </Link>
              <Link href="/program" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                Training Program
              </Link>
              <Link href="/login" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                Login/Register
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Training Calendar</h1>
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-600">Training calendar content will be displayed here.</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-4">
        <div className="container mx-auto px-4 text-center">
          <p>© JayIdoanS @ 2025 - RIOT Bandung</p>
        </div>
      </footer>
    </div>
  );
}