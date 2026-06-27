import type { Metadata } from "next"
import "./globals.css"
import Providers from "@/components/providers"

export const metadata: Metadata = {
  title: "Controle de Produtos Químicos",
  description: "Controle semanal de consumo de produtos químicos - Safra",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
