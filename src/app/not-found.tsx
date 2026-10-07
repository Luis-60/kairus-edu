import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="flex max-w-md flex-col gap-3">
        <h1 className="text-[28px] leading-[34px] font-bold">Página não encontrada</h1>
        <p className="text-muted">O endereço pode ter mudado ou você não tem acesso a ele.</p>
        <Link href="/inicio" className="font-bold text-primary hover:text-primary-hover">
          Ir para a página inicial →
        </Link>
      </div>
    </main>
  );
}
