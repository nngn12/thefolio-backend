router.put("/profile", protect, upload.single("profilePic"), async (req, res) => {
    try {
        const { name, bio } = req.body;

        let profilePicUrl = null;

        // 1. Upload to Supabase
        if (req.file) {
            const fileName = `${Date.now()}-${req.file.originalname}`;

            const { data, error } = await supabase.storage
                .from("uploads")
                .upload(`profile/${fileName}`, req.file.buffer, {
                    contentType: req.file.mimetype,
                });

            if (error) throw error;

            const { data: publicUrl } = supabase.storage
                .from("uploads")
                .getPublicUrl(data.path);

            profilePicUrl = publicUrl.publicUrl;
        }

        // 2. FIXED SQL (NO COALESCE — fully safe)
        const result = await pool.query(
            `UPDATE users 
             SET name = $1,
                 bio = $2,
                 profile_pic = COALESCE($3::text, profile_pic)
             WHERE id = $4
             RETURNING id, name, bio, profile_pic, email, role`,
            [name, bio, profilePicUrl, req.user.id]
        );

        res.json(result.rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});
