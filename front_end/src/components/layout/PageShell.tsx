import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AnimatedBackground from "@/components/ui/AnimatedBackground";

interface PageShellProps {
  children: React.ReactNode;
  withBackground?: boolean;
  mainClassName?: string;
}

/**
 * Shared page chrome – header, animated background, footer.
 * Avoids repeating the same 3 imports + wrapper div in every top-level page.
 */
export default function PageShell({
  children,
  withBackground = true,
  mainClassName = "pb-10 overflow-x-hidden font-sans bg-transparent relative z-10",
}: PageShellProps) {
  return (
    <>
      <Header />
      {withBackground && <AnimatedBackground />}
      <div className={mainClassName}>{children}</div>
      <Footer />
    </>
  );
}
