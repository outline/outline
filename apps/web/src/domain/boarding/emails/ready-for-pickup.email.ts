const joinPetNames = (names: readonly string[]): string => {
	if (names.length === 0) return "anabulmu";
	if (names.length === 1) return names[0] as string;
	return `${names.slice(0, -1).join(", ")} dan ${names[names.length - 1]}`;
};

export const buildReadyForPickupEmail = (
	petNames: readonly string[],
	ownerName: string,
): {
	readonly subject: string;
	readonly text: string;
	readonly html: string;
} => {
	const petLabel = joinPetNames(petNames);
	const subject = `${petLabel} sudah siap dijemput!`;
	const text = `Halo ${ownerName},

Anabulmu, ${petLabel}, sudah selesai dititipkan di Pet Store dan siap untuk dijemput.

Silakan datang ke cabang kami untuk mengambil ${petLabel} kapan saja pada jam operasional.

Terima kasih sudah mempercayakan ${petLabel} kepada kami!

Salam,
Tim Pet Store`;
	const html = `
  <div style="font-family: sans-serif; line-height: 1.6; color: #222;">
    <p>Halo <strong>${ownerName}</strong>,</p>
    <p>Anabulmu, <strong>${petLabel}</strong>, sudah selesai dititipkan di Pet Store dan siap untuk dijemput.</p>
    <p>Silakan datang ke cabang kami untuk mengambil <strong>${petLabel}</strong> kapan saja pada jam operasional.</p>
    <p>Terima kasih sudah mempercayakan ${petLabel} kepada kami!</p>
    <p>Salam,<br/>Tim Pet Store</p>
  </div>`;
	return { subject, text, html };
};
