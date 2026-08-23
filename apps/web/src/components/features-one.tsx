import { Table } from "@/components/table";
import { Card } from "@/components/ui/card";

export default function Features() {
	return (
		<section>
			<div className="bg-muted/50 py-24">
				<div className="mx-auto w-full max-w-5xl px-6">
					<div>
						<h2 className="text-foreground text-4xl font-semibold">
							Manajemen Pet Shop Tanpa Ribet
						</h2>
						<p className="text-muted-foreground mb-12 mt-4 text-balance text-lg">
							Tinggalkan cara manual. Dari reservasi hotel hewan peliharaan
							(boarding), manajemen kasir (POS), pantau stok otomatis, hingga
							pembukuan keuangan—semuanya otomatis terhubung dalam satu dasbor
							yang pintar.
						</p>
						<div className="bg-foreground/5 rounded-3xl p-6">
							<Table />
						</div>
					</div>

					<div className="border-foreground/10 relative mt-16 grid gap-12 border-b pb-12 [--radius:1rem] md:grid-cols-2">
						<div>
							<h3 className="text-foreground text-xl font-semibold">
								Sistem Booking & Boarding
							</h3>
							<p className="text-muted-foreground my-4 text-lg">
								Atur kapasitas kandang, jadwalkan grooming, dan pantau status
								hewan peliharaan klien dengan mudah dan transparan.
							</p>
							<Card className="aspect-video overflow-hidden px-6">
								<Card className="h-full translate-y-6" />
							</Card>
						</div>
						<div>
							<h3 className="text-foreground text-xl font-semibold">
								Laporan Keuangan Otomatis
							</h3>
							<p className="text-muted-foreground my-4 text-lg">
								Pemasukan dari kasir dan pengeluaran operasional langsung
								terekap otomatis jadi laporan laba rugi.
							</p>
							<Card className="aspect-video overflow-hidden">
								<Card className="translate-6 h-full" />
							</Card>
						</div>
					</div>

					<blockquote className="before:bg-primary relative mt-12 max-w-xl pl-6 before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-full">
						<p className="text-foreground text-lg">
							"Semenjak pakai Petso, operasional pet shop jadi jauh lebih
							tertata. Kasir, stok, sampai pembukuan nggak perlu lagi input
							manual di Excel. Benar-benar sangat membantu!"
						</p>
						<footer className="mt-4 flex items-center gap-2">
							<cite>Ridho</cite>
							<span
								aria-hidden
								className="bg-foreground/15 size-1 rounded-full"
							/>
							<span className="text-muted-foreground">Owner Pet Shop</span>
						</footer>
					</blockquote>
				</div>
			</div>
		</section>
	);
}
