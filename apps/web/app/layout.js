import "./globals.css";

export const metadata = {
  title: "FundChain",
  description: "Decentralized crowdfunding on Ethereum",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
