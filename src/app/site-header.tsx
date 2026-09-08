'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#232327] bg-[#0b0b0d]">
      <div className="mx-auto flex h-[76px] max-w-[1180px] items-center justify-between px-5 md:px-7">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="JAAD Logistics" width={40} height={40} className="h-10 w-auto" />
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <a href="/#services" className="text-sm font-semibold text-[#c9c9cd] hover:text-[#ff5c53]">Services</a>
          <a href="/#how" className="text-sm font-semibold text-[#c9c9cd] hover:text-[#ff5c53]">How it works</a>
          <a href="/#track" className="text-sm font-semibold text-[#c9c9cd] hover:text-[#ff5c53]">Track a shipment</a>
          <a href="/#contact" className="text-sm font-semibold text-[#c9c9cd] hover:text-[#ff5c53]">Contact</a>
        </nav>

        <div className="hidden items-center gap-2.5 md:flex">
          <Link
            href="/customer/login"
            className="rounded-sm border-[1.5px] border-[#3a3a40] bg-transparent px-4 py-2.5 text-[12.5px] font-bold text-white hover:border-white hover:bg-white hover:text-[#0b0b0d]"
          >
            Customer login
          </Link>
          <Link
            href="/login"
            className="rounded-sm border-[1.5px] border-[#0b0b0d] bg-[#0b0b0d] px-4 py-2.5 text-[12.5px] font-bold text-white hover:border-[#e5231b] hover:bg-[#e5231b]"
          >
            Admin login
          </Link>
        </div>

        {/* mobile menu button */}
        <button
          onClick={() => setOpen(!open)}
          className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 md:hidden"
          aria-label="Menu"
        >
          <span className={`h-[2px] w-6 bg-white transition-transform ${open ? 'translate-y-2 rotate-45' : ''}`} />
          <span className={`h-[2px] w-6 bg-white transition-opacity ${open ? 'opacity-0' : ''}`} />
          <span className={`h-[2px] w-6 bg-white transition-transform ${open ? '-translate-y-2 -rotate-45' : ''}`} />
        </button>
      </div>

      {/* mobile menu panel */}
      {open && (
        <div className="border-t border-[#232327] bg-[#0b0b0d] px-5 py-5 md:hidden">
          <div className="flex flex-col gap-4">
            <a href="/#services" onClick={() => setOpen(false)} className="text-sm font-semibold text-[#c9c9cd]">Services</a>
            <a href="/#how" onClick={() => setOpen(false)} className="text-sm font-semibold text-[#c9c9cd]">How it works</a>
            <a href="/#track" onClick={() => setOpen(false)} className="text-sm font-semibold text-[#c9c9cd]">Track a shipment</a>
            <a href="/#contact" onClick={() => setOpen(false)} className="text-sm font-semibold text-[#c9c9cd]">Contact</a>
          </div>
          <div className="mt-5 flex flex-col gap-2.5 border-t border-[#232327] pt-5">
            <Link
              href="/customer/login"
              className="rounded-sm border-[1.5px] border-[#3a3a40] px-4 py-2.5 text-center text-[12.5px] font-bold text-white"
            >
              Customer login
            </Link>
            <Link
              href="/login"
              className="rounded-sm border-[1.5px] border-[#0b0b0d] bg-[#e5231b] px-4 py-2.5 text-center text-[12.5px] font-bold text-white"
            >
              Admin login
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
