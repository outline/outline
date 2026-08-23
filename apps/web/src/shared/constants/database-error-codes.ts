export const DB_ERROR_CODES = {
	UNIQUE_VIOLATION: "23505",
	FOREIGN_KEY_VIOLATION: "23503",
	NOT_NULL_VIOLATION: "23502",
	CHECK_VIOLATION: "23514",
	INSUFFICIENT_PRIVILEGE: "42501",
	RAISE_EXCEPTION: "P0001",
	INVALID_TEXT_REPRESENTATION: "22P02",
	DEADLOCK_DETECTED: "40P01",
	SERIALIZATION_FAILURE: "40001",
} as const;

export type TDbErrorCode = (typeof DB_ERROR_CODES)[keyof typeof DB_ERROR_CODES];

export const DB_ERROR_MESSAGES: Record<string, string> = {
	[DB_ERROR_CODES.UNIQUE_VIOLATION]:
		"Data yang dimasukkan sudah terdaftar (Duplikat).",
	[DB_ERROR_CODES.FOREIGN_KEY_VIOLATION]:
		"Data referensi tidak ditemukan atau sedang digunakan.",
	[DB_ERROR_CODES.NOT_NULL_VIOLATION]: "Ada kolom wajib yang belum diisi.",
	[DB_ERROR_CODES.CHECK_VIOLATION]: "Data tidak memenuhi syarat validasi.",
	[DB_ERROR_CODES.INSUFFICIENT_PRIVILEGE]:
		"Anda tidak memiliki akses untuk melakukan aksi ini.",
	[DB_ERROR_CODES.INVALID_TEXT_REPRESENTATION]:
		"Format data yang dimasukkan tidak valid.",
	[DB_ERROR_CODES.DEADLOCK_DETECTED]:
		"Terjadi antrean proses, silakan coba lagi.",
	[DB_ERROR_CODES.SERIALIZATION_FAILURE]:
		"Proses gagal karena ada perubahan data bersamaan.",
};
