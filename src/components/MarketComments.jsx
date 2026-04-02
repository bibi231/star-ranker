import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Heart, Reply, Trash2, Loader2, User } from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '../lib/api';
import { useStore } from '../store/storeModel';
import { cn, formatTimeAgo } from '../lib/utils';
import toast from 'react-hot-toast';

export function MarketComments({ itemId }) {
    const { user } = useStore();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [replyingTo, setReplyingTo] = useState(null); // { id, userDisplayName }
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const load = async () => {
        try {
            const data = await apiGet(`/api/markets/${itemId}/comments`);
            setComments(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [itemId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || submitting) return;
        if (!user) return toast.error("Connect identity to participate");

        setSubmitting(true);
        try {
            await apiPost(`/api/markets/${itemId}/comments`, { 
                content: newComment,
                parentId: replyingTo?.id || null
            });
            setNewComment("");
            setReplyingTo(null);
            load();
            toast.success("Intelligence deployed");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleLike = async (commentId) => {
        if (!user) return toast.error("Log in to like");
        try {
            await apiPost(`/api/markets/comments/${commentId}/like`);
            setComments(prev => prev.map(c => 
                c.id === commentId ? { ...c, likes: (c.likes || 0) + 1 } : c
            ));
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleDelete = async (commentId) => {
        try {
            await apiDelete(`/api/comments/${commentId}`); // Using the dedicated router for general actions
            setComments(prev => prev.filter(c => c.id !== commentId));
            toast.success("Redacted");
        } catch (err) {
            toast.error(err.message);
        }
    };

    // Build threaded structure
    const topLevel = comments.filter(c => !c.parentId);
    const getReplies = (parentId) => comments.filter(c => c.parentId === parentId);

    if (loading) return (
        <div className="py-20 text-center">
            <Loader2 className="animate-spin mx-auto text-brand-accent h-8 w-8 mb-4 opacity-50" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Scanning Discussion...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Input Section */}
            <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-xl space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <MessageSquare size={14} className="text-brand-accent" />
                    <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Intelligence Feed</h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    {replyingTo && (
                        <div className="px-3 py-1.5 rounded-lg bg-brand-accent/10 border border-brand-accent/20 flex justify-between items-center">
                            <span className="text-[9px] font-black text-brand-accent uppercase">
                                Replying to @{replyingTo.userDisplayName}
                            </span>
                            <button 
                                type="button" 
                                onClick={() => setReplyingTo(null)}
                                className="text-brand-accent hover:text-white"
                            >
                                <Trash2 size={10} />
                            </button>
                        </div>
                    )}
                    <div className="relative group">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={replyingTo ? "Compose reply..." : "Share market intelligence..."}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 pr-16 text-xs text-white placeholder:text-slate-700 focus:outline-none focus:border-brand-accent/50 focus:ring-1 focus:ring-brand-accent/20 transition-all min-h-[100px] resize-none"
                        />
                        <button
                            disabled={submitting || !newComment.trim()}
                            className="absolute bottom-4 right-4 p-2.5 rounded-xl bg-brand-accent text-[#0D1B2A] hover:scale-110 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 shadow-lg shadow-brand-accent/20"
                        >
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                    </div>
                </form>
            </div>

            {/* Comments List */}
            <div className="space-y-6">
                {topLevel.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-slate-900/50 rounded-3xl">
                        <div className="p-4 rounded-full bg-slate-900/30 w-fit mx-auto mb-4">
                            <Activity size={24} className="text-slate-800" />
                        </div>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Silence across the protocol</p>
                        <p className="text-[9px] text-slate-700 mt-2 font-bold uppercase">Be the first to provide signal</p>
                    </div>
                ) : (
                    topLevel.map(comment => (
                        <div key={comment.id} className="space-y-4">
                            <CommentCard 
                                comment={comment} 
                                onReply={() => {
                                    setReplyingTo({ id: comment.id, userDisplayName: comment.userDisplayName || 'Oracle' });
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                onLike={() => handleLike(comment.id)}
                                onDelete={() => handleDelete(comment.id)}
                                isOwner={user?.uid === comment.userId}
                            />
                            
                            {/* Replies */}
                            <div className="ml-8 pl-4 border-l border-slate-800/50 space-y-4">
                                {getReplies(comment.id).map(reply => (
                                    <CommentCard 
                                        key={reply.id} 
                                        comment={reply}
                                        isReply
                                        onLike={() => handleLike(reply.id)}
                                        onDelete={() => handleDelete(reply.id)}
                                        isOwner={user?.uid === reply.userId}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function CommentCard({ comment, onReply, onLike, onDelete, isOwner, isReply = false }) {
    return (
        <div className={cn(
            "group p-5 rounded-2xl bg-slate-900/40 border border-slate-800 transition-all hover:bg-slate-900/60 hover:border-slate-700/50",
            isReply ? "p-4 bg-slate-900/20" : ""
        )}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-brand-accent/5 border border-brand-accent/20 flex items-center justify-center text-brand-accent">
                        <User size={14} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-brand-accent uppercase tracking-wider">
                                {comment.oracleHandle ? `@${comment.oracleHandle}` : (comment.userDisplayName || 'Anonymous Oracle')}
                            </span>
                            {comment.oracleHandle && (
                                <div className="px-1.5 py-0.5 rounded bg-brand-accent/10 border border-brand-accent/20 text-[7px] font-black text-brand-accent uppercase">Verified</div>
                            )}
                        </div>
                        <span className="text-[8px] text-slate-500 uppercase font-black">{formatTimeAgo(comment.createdAt)}</span>
                    </div>
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onReply && (
                        <ActionButton icon={<Reply size={12} />} onClick={onReply} label="Reply" />
                    )}
                    {isOwner && (
                        <ActionButton icon={<Trash2 size={12} />} onClick={onDelete} color="text-rose-500 hover:bg-rose-500/10" label="Redact" />
                    )}
                </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed font-medium mb-4 whitespace-pre-wrap">
                {comment.content}
            </p>

            <div className="flex items-center gap-4">
                <button 
                    onClick={onLike}
                    className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-500 hover:text-rose-500 transition-colors"
                >
                    <Heart size={12} className={cn(comment.likes > 0 ? "fill-rose-500 text-rose-500" : "")} />
                    {comment.likes || 0} Signal
                </button>
            </div>
        </div>
    );
}

function ActionButton({ icon, onClick, label, color = "text-slate-400 hover:bg-white/5 hover:text-white" }) {
    return (
        <button 
            onClick={onClick}
            className={cn("p-1.5 rounded-lg transition-all flex items-center gap-1", color)}
            title={label}
        >
            {icon}
        </button>
    );
}
