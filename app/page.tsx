"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

const slides = ["/slide1.jpg", "/slide2.jpg", "/slide3.jpg", "/slide4.jpg"];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-[family-name:var(--font-geist-sans)]">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between sm:h-24">
            <div className="flex-shrink-0 flex items-center">
              <Image
                src="/prograce-logo.png"
                alt="ProgrACE — Train Today. Go Further."
                width={2172}
                height={724}
                className="h-auto w-44 sm:w-56"
                priority
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

      {/* Image Slider */}
      <div className="relative w-full h-[400px] overflow-hidden">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute w-full h-full transition-opacity duration-500 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
          >
            <Image
              src={slide}
              alt={`Slide ${index + 1}`}
              fill
              style={{ objectFit: 'cover' }}
              priority={index === 0}
            />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Add your main content here */}
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
