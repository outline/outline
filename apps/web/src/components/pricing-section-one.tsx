import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Pricing() {
	return (
		<div className="bg-muted relative py-16 md:py-32">
			<div className="mx-auto max-w-5xl px-6">
				<div className="mx-auto max-w-2xl text-center">
					<h2 className="text-foreground text-balance text-3xl font-bold md:text-4xl lg:text-5xl">
						Harga Spesial untuk Pet Shop Anda
					</h2>
					<p className="text-muted-foreground mx-auto mt-4 max-w-md text-balance text-lg">
						Pilih paket yang paling sesuai dengan kebutuhan bisnismu dan mulai
						optimalkan operasional hari ini juga.
					</p>
				</div>
				<div className="mt-8 md:mt-16">
					<Card className="relative">
						<div className="grid items-center gap-12 divide-y p-12 md:grid-cols-2 md:divide-x md:divide-y-0">
							<div className="pb-12 text-center md:pb-0 md:pr-12">
								<h3 className="text-foreground text-2xl font-semibold">
									Paket Bisnis
								</h3>
								<p className="text-foreground mt-2 text-lg">
									Untuk pet shop yang sedang berkembang
								</p>
								<span className="text-foreground mb-6 mt-12 inline-block text-5xl font-bold">
									Rp<span className="text-6xl ml-1">299</span>
									<span className="text-3xl text-muted-foreground">rb</span>
								</span>

								<div className="flex justify-center">
									<Button asChild size="lg">
										<Link to="/signup">Mulai Sekarang</Link>
									</Button>
								</div>

								<p className="text-muted-foreground mt-12 text-sm">
									Termasuk: Sistem POS, Manajemen Boarding, Laporan Keuangan, &
									Multi-Cabang.
								</p>
							</div>
							<div className="relative pt-12 md:pl-12 md:pt-0">
								<ul className="space-y-4">
									{[
										"Pencatatan kasir otomatis",
										"Booking & jadwal hotel peliharaan",
										"Notifikasi WhatsApp ke pelanggan",
										"Akses seluruh fitur tanpa batasan",
									].map((item, index) => (
										<li key={index} className="flex items-center gap-2">
											<Check
												className="text-primary size-3"
												strokeWidth={3.5}
											/>
											<span className="text-foreground">{item}</span>
										</li>
									))}
								</ul>
								<p className="text-muted-foreground mt-6 text-sm">
									Mendukung ukuran tim berapapun, tanpa repot masalah akun.
									Platform kami telah dipercaya oleh:
								</p>
								<div className="mt-6 flex items-center gap-6 text-xl font-bold text-muted-foreground opacity-60">
									<span>Meow Petshop</span>
									<span>Pawsome</span>
									<span>Doggo Care</span>
								</div>
							</div>
						</div>
					</Card>
				</div>
			</div>
		</div>
	);
}
