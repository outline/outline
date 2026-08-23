export default function TestimonialSection() {
	return (
		<section>
			<div className="py-24">
				<div className="mx-auto w-full max-w-5xl px-6">
					<blockquote className="before:bg-primary relative max-w-xl pl-6 before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-full">
						<p className="text-foreground text-lg">
							Using Petso has been like unlocking a secret design superpower.
							It's the perfect fusion of simplicity and versatility, enabling us
							to create UIs that are as stunning as they are user-friendly.
						</p>
						<footer className="mt-4 flex items-center gap-2">
							<cite className="text-foreground">John Doe</cite>
							<span
								aria-hidden
								className="bg-foreground/15 size-1 rounded-full"
							/>
							<span className="text-muted-foreground">Product Designer</span>
						</footer>
					</blockquote>
				</div>
			</div>
		</section>
	);
}
