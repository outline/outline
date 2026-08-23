export const buildAccessGrantedEmail = (
	branchName: string,
	role: string,
): {
	readonly subject: string;
	readonly text: string;
	readonly html: string;
} => {
	const subject = `Kamu ditambahkan sebagai staff di ${branchName}`;
	const text = `Halo,

Kamu baru saja ditambahkan sebagai staff dengan peran "${role}" di ${branchName} pada Pet Store.

Login ke akun Pet Store kamu untuk mulai mengakses cabang ini.

Salam,
Tim Pet Store`;
	const html = `
  <div style="font-family: sans-serif; line-height: 1.6; color: #222;">
    <p>Halo,</p>
    <p>Kamu baru saja ditambahkan sebagai staff dengan peran <strong>${role}</strong> di <strong>${branchName}</strong> pada Pet Store.</p>
    <p>Login ke akun Pet Store kamu untuk mulai mengakses cabang ini.</p>
    <p>Salam,<br/>Tim Pet Store</p>
  </div>`;
	return { subject, text, html };
};
