import "./globals.css";
import CartProvider from "@/components/CartProvider";
import Header from "@/components/Header";

export const metadata = {
  title: "KidsRoom – Stylish kids fashion",
  description: "Order stylish clothes for kids online, in the right fit.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <Header />
          <main>{children}</main>
          <footer className="footer">© KidsRoom – Style that grows with them</footer>
        </CartProvider>
      </body>
    </html>
  );
}
