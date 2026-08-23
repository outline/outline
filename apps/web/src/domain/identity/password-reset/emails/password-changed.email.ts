export const buildPasswordChangedEmail = (): {
	readonly subject: string;
	readonly text: string;
	readonly html: string;
} => {
	const subject = "Password akun Pet Store berhasil diubah";
	const text = `Halo,

Password akun Pet Store kamu baru saja berhasil diubah.

Jika ini bukan anda yang melakukan perubahan ini, segera hubungi tim support kami - akun kamu mungkin sedang diakses oleh orang lain.

Salam,
Tim Pet Store`;
	const html = `
  <div style="font-family: sans-serif; line-height: 1.6; color: #222;">
    <p>Halo,</p>
    <p>Password akun Pet Store kamu baru saja berhasil diubah.</p>
    <p><strong>Jika ini bukan anda</strong> yang melakukan perubahan ini, segera hubungi tim support kami - akun kamu mungkin sedang diakses oleh orang lain.</p>
    <p>Salam,<br/>Tim Pet Store</p>
  </div>`;
	return { subject, text, html };
};
