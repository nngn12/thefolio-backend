import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getTheme } from "../theme";
import API from "../api/axios";

const HomePage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { isDark } = useTheme();
    const t = getTheme(isDark);

    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    const BASE_URL = process.env.REACT_APP_API_URL || "https://thefolio-backend.onrender.com";

    useEffect(() => {
        API.get("/posts")
            .then(r => setPosts(Array.isArray(r.data) ? r.data : []))
            .catch(() => setPosts([]))
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (e, postId) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm("Delete this post and all its comments?")) return;

        try {
            await API.delete(`/posts/${postId}`);
            setPosts(prev => prev.filter(p => (p._id || p.id) !== postId));
        } catch (err) {
            alert(err.response?.data?.message || "Failed to delete");
        }
    };

    const handleEdit = (e, postId) => {
        e.preventDefault();
        e.stopPropagation();
        navigate(`/edit-post/${postId}`);
    };

    return (
        <div style={{ fontFamily: t.fontSans, background: t.bg, minHeight: "100vh", paddingBottom: "80px" }}>

            {/* HERO HEADER */}
            <div style={{ borderBottom: `1px solid ${t.border}`, padding: "56px 24px 48px", textAlign: "center" }}>
                <p style={{ fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", color: t.pink, fontWeight: "500", marginBottom: "16px" }}>
                    Our Journal
                </p>

                <h1 style={{
                    fontFamily: t.fontSerif,
                    fontStyle: "italic",
                    fontSize: "clamp(36px, 5vw, 54px)",
                    fontWeight: "400",
                    color: t.text,
                    marginBottom: "16px"
                }}>
                    Latest Memories
                </h1>

                {user && (
                    <button
                        onClick={() => navigate("/create")}
                        style={{
                            padding: "11px 28px",
                            borderRadius: "24px",
                            border: "none",
                            background: t.pinkGrad,
                            color: "white",
                            fontWeight: "600",
                            fontSize: "13px",
                            cursor: "pointer",
                            boxShadow: "0 4px 18px rgba(190,24,93,0.3)"
                        }}
                    >
                        New Post
                    </button>
                )}
            </div>

            {/* POSTS */}
            <div style={{ maxWidth: "760px", margin: "0 auto", padding: "48px 24px 0" }}>
                {loading && <div style={{ textAlign: "center", color: t.textSub }}>Loading posts...</div>}

                {!loading && posts.length === 0 && (
                    <div style={{ textAlign: "center", padding: "80px 0" }}>
                        <p style={{ fontFamily: t.fontSerif, fontStyle: "italic", fontSize: "22px", color: t.textSub }}>
                            No memories yet
                        </p>
                    </div>
                )}

                <div style={{ display: "grid", gap: "2px" }}>
                    {posts.map((post, i) => {
                        const postId = post._id || post.id;

                        let postImage = null;
                        if (post.image) {
                            postImage = post.image.startsWith("http")
                                ? post.image
                                : `${BASE_URL}/uploads/${post.image}`;
                        }

                        return (
                            <article
                                key={postId}
                                onClick={() => navigate(`/post/${postId}`)}
                                style={{
                                    display: "flex",
                                    gap: "24px",
                                    cursor: "pointer",
                                    borderBottom: `1px solid ${t.border}`,
                                    padding: "28px 0",
                                    animation: `fadeUp 0.4s ease ${i * 0.06}s both`
                                }}
                            >
                                <div style={{ flex: 1 }}>

                                    {/* ✅ AUTHOR INFO ADDED */}
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                                        <img
                                            src={
                                                post.author?.profile_pic
                                                    ? (post.author.profile_pic.startsWith("http")
                                                        ? post.author.profile_pic
                                                        : `${BASE_URL}/uploads/${post.author.profile_pic}`)
                                                    : `https://ui-avatars.com/api/?name=${post.author?.name || "U"}&background=BE185D&color=fff`
                                            }
                                            alt=""
                                            style={{
                                                width: "24px",
                                                height: "24px",
                                                borderRadius: "50%",
                                                objectFit: "cover"
                                            }}
                                        />

                                        <span style={{ fontSize: "12px", color: t.textMuted }}>
                                            {post.author?.name || "Unknown"} ·{" "}
                                            {new Date(post.createdAt || post.created_at).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <h2 style={{
                                        fontFamily: t.fontSerif,
                                        fontWeight: "500",
                                        fontSize: "22px",
                                        color: t.text,
                                        marginBottom: "8px"
                                    }}>
                                        {post.title}
                                    </h2>

                                    <p style={{ fontSize: "14px", color: t.textSub, lineHeight: "1.65" }}>
                                        {post.body?.substring(0, 120)}...
                                    </p>

                                    {/* Admin Controls */}
                                    {user?.role === "admin" && (
                                        <div style={{ marginTop: "12px", display: "flex", gap: "10px" }}>
                                            <button onClick={(e) => handleEdit(e, postId)} style={{ background: "none", border: "none", color: t.pink, cursor: "pointer", fontSize: "12px" }}>
                                                ✏️ Edit
                                            </button>
                                            <button onClick={(e) => handleDelete(e, postId)} style={{ background: "none", border: "none", color: "#ff4444", cursor: "pointer", fontSize: "12px" }}>
                                                🗑 Delete
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* IMAGE */}
                                {postImage && (
                                    <div style={{
                                        width: "120px",
                                        height: "90px",
                                        flexShrink: 0,
                                        borderRadius: "8px",
                                        overflow: "hidden",
                                        background: t.border
                                    }}>
                                        <img
                                            src={postImage}
                                            alt=""
                                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                            onError={(e) => { e.target.parentNode.style.display = 'none'; }}
                                        />
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            </div>

            <style>{`
                @keyframes fadeUp {
                    from { opacity:0; transform:translateY(14px); }
                    to { opacity:1; transform:translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default HomePage;
