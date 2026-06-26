import DamProvider from "@/components/DamProvider";
import Navbar from "@/components/Navbar";
import Workspace from "@/components/Workspace";

export default function Home() {
  return (
    <DamProvider>
      <Navbar />
      <main>
        <Workspace />
      </main>
    </DamProvider>
  );
}
