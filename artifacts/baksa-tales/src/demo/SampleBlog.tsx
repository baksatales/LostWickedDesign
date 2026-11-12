import { useEffect, useState, type FormEvent } from "react";
import { Link } from "wouter";
import type { SampleBlogPost, SampleBlogPostInput, SampleBlogResponse } from "@workspace/api-client-react";
import { SAMPLE_SESSION_KEY } from "./SampleAccount";

type Draft = SampleBlogPostInput;
const adminApi = "/api/sample/admin/blog";
const publicApi = "/api/sample/blog";
const blank = (): Draft => ({ slug: "", title: "", excerpt: "", body: "", author: "Baksa Tales", status: "draft" });
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
const messageOf = (error: unknown) => error instanceof Error ? error.message : "The blog request failed.";
const dateLabel = (value: string) => new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export function SampleAdminBlog() {
  const [token, setToken] = useState("");
  const [posts, setPosts] = useState<SampleBlogPost[]>([]);
  const [draft, setDraft] = useState<Draft>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try { setToken(localStorage.getItem(SAMPLE_SESSION_KEY) || ""); }
    catch { setError("Sample session storage is unavailable."); setLoading(false); }
  }, []);

  const load = async (sessionToken: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(adminApi, { cache: "no-store", headers: { authorization: `Bearer ${sessionToken}` } });
      const result = await response.json() as SampleBlogResponse & { error?: string };
      if (!response.ok || !result.sample) throw new Error(result.error || "Sample blog posts could not be loaded.");
      setPosts(result.posts);
    } catch (cause) { setError(messageOf(cause)); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (token) void load(token); }, [token]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) { setError("Your sample admin session expired. Sign in again at /admin."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(editingId ? `${adminApi}/${encodeURIComponent(editingId)}` : adminApi, {
        method: editingId ? "PUT" : "POST", cache: "no-store",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ ...draft, slug: slugify(draft.slug) }),
      });
      const post = await response.json() as SampleBlogPost & { error?: string };
      if (!response.ok) throw new Error(post.error || "The sample post could not be saved.");
      setNotice(`${post.title} saved as a ${post.status}.`);
      setDraft(blank()); setEditingId(null); setSlugTouched(false);
      await load(token);
    } catch (cause) { setError(messageOf(cause)); }
    finally { setBusy(false); }
  };

  const edit = (post: SampleBlogPost) => {
    setDraft({ slug: post.slug, title: post.title, excerpt: post.excerpt, body: post.body, author: post.author, status: post.status });
    setEditingId(post.id); setSlugTouched(true); setNotice(""); setError("");
  };
  const cancel = () => { setDraft(blank()); setEditingId(null); setSlugTouched(false); setError(""); };
  const updateTitle = (title: string) => setDraft(value => ({ ...value, title, slug: slugTouched ? value.slug : slugify(title) }));

  return (
    <main className="bt-admin-blog" data-testid="admin-blog-page">
      <aside className="bt-admin-blog-nav">
        <span className="bt-account-eyebrow">Baksa Tales · sample admin</span>
        <h2>Team admin</h2>
        <nav aria-label="Admin modules">
          <Link href="/admin">Overview</Link><Link href="/admin/reviews">Listing reviews</Link>
          <Link href="/admin/orders">Orders and payouts</Link><Link href="/admin/enquiries">Corporate enquiries</Link>
          <Link href="/admin/academy">Academy</Link><Link href="/admin/coupons">Coupons</Link>
          <Link href="/admin/blog" aria-current="page">Blog</Link>
        </nav>
        <p>Sample module · posts are separate from the live website.</p>
      </aside>
      <section className="bt-admin-blog-body">
        <p className="bt-account-eyebrow">Editorial</p>
        <h1>Blog.</h1>
        <p className="bt-admin-blog-intro">Write, save, edit and publish sample journal posts. Published posts appear on the preview’s Journal page; no live content is changed.</p>
        {notice && <p className="bt-admin-blog-notice" role="status">{notice}</p>}
        {error && <p className="bt-admin-blog-error" role="alert">{error}</p>}
        <form className="bt-admin-blog-form" onSubmit={submit} data-testid="blog-form">
          <h2>{editingId ? "Edit a post" : "Write a post"}</h2>
          <label>Title<input required minLength={3} maxLength={160} value={draft.title} onChange={e => updateTitle(e.target.value)} data-testid="blog-title"/></label>
          <label>URL slug<input required minLength={3} maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={draft.slug} onChange={e => { setSlugTouched(true); setDraft(value => ({ ...value, slug: slugify(e.target.value) })); }} data-testid="blog-slug"/></label>
          <label>Short introduction<textarea required minLength={10} maxLength={500} value={draft.excerpt} onChange={e => setDraft(value => ({ ...value, excerpt: e.target.value }))} data-testid="blog-excerpt"/></label>
          <label>Article text<textarea required minLength={30} maxLength={12000} rows={10} value={draft.body} onChange={e => setDraft(value => ({ ...value, body: e.target.value }))} data-testid="blog-body"/></label>
          <div className="bt-admin-blog-inline">
            <label>Byline<input required minLength={2} maxLength={120} value={draft.author} onChange={e => setDraft(value => ({ ...value, author: e.target.value }))}/></label>
            <label>Publication status<select value={draft.status} onChange={e => setDraft(value => ({ ...value, status: e.target.value as Draft["status"] }))} data-testid="blog-status"><option value="draft">Save as draft</option><option value="published">Publish to sample Journal</option></select></label>
          </div>
          <div className="bt-admin-blog-actions">
            <button className="bt-account-primary" disabled={busy}>{busy ? "Saving…" : editingId ? "Save changes" : "Save post"}</button>
            {editingId && <button className="bt-account-secondary" type="button" onClick={cancel}>Cancel</button>}
          </div>
        </form>
        <section className="bt-admin-blog-list" aria-labelledby="sample-blog-list-title">
          <div className="bt-admin-blog-list-head"><h2 id="sample-blog-list-title">Sample posts</h2><button className="bt-account-secondary" type="button" onClick={() => token && void load(token)} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button></div>
          {loading ? <p role="status">Loading sample posts…</p> : posts.length === 0 ? <p>No posts yet. Draft one above, then publish it when ready.</p> : posts.map(post => (
            <article className="bt-admin-blog-row" key={post.id} data-testid={`blog-row-${post.slug}`}>
              <div><strong>{post.title}</strong><span className={post.status}>{post.status}</span></div>
              <p>{post.excerpt}</p><small>{post.author} · updated {dateLabel(post.updatedAt)}{post.status === "published" ? ` · published ${dateLabel(post.publishedAt || post.updatedAt)}` : ""}</small>
              <div className="bt-admin-blog-row-actions"><Link href={`/blog/${post.slug}`}>Preview</Link><button className="bt-account-secondary" type="button" onClick={() => edit(post)}>Edit</button></div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}

export function SampleBlog({ path }: { path: string }) {
  const [posts, setPosts] = useState<SampleBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void fetch(publicApi, { cache: "no-store" }).then(async response => {
      const result = await response.json() as SampleBlogResponse & { error?: string };
      if (!response.ok || !result.sample) throw new Error(result.error || "The sample Journal is unavailable.");
      if (active) setPosts(result.posts);
    }).catch(cause => { if (active) setError(messageOf(cause)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const slug = path.startsWith("/blog/") ? decodeURIComponent(path.slice("/blog/".length)) : "";
  const article = slug ? posts.find(post => post.slug === slug) : undefined;
  return (
    <main className="bt-blog-page" data-testid="blog-page">
      <p className="bt-account-eyebrow">Baksa Tales · sample journal</p>
      {slug ? article ? <article className="bt-blog-article">
        <Link href="/blog" className="bt-blog-back">← All stories</Link>
        <p className="bt-blog-byline">{article.author} · {dateLabel(article.publishedAt || article.updatedAt)}</p>
        <h1>{article.title}</h1><p className="bt-blog-excerpt">{article.excerpt}</p>
        <div className="bt-blog-body">{article.body.split(/\n\s*\n/).map((paragraph, i) => <p key={i}>{paragraph}</p>)}</div>
        <p className="bt-blog-sample-note">Sample article · preview only</p>
      </article> : <section className="bt-blog-empty"><h1>This story isn’t published.</h1><p>Only published sample posts are visible here.</p><Link href="/blog">Back to the Journal</Link></section>
        : <><h1>Journal.</h1><p className="bt-blog-lede">Stories, notes and ideas from the Baksa Tales community.</p>
          {loading ? <p role="status">Loading the sample Journal…</p> : error ? <p role="alert">{error}</p> : posts.length === 0 ? <section className="bt-blog-empty"><h2>No stories published yet.</h2><p>Published sample posts will appear here.</p></section> :
            <section className="bt-blog-grid" aria-label="Published sample posts">{posts.map(post => <article className="bt-blog-card" key={post.id}>
              <p className="bt-blog-byline">{post.author} · {dateLabel(post.publishedAt || post.updatedAt)}</p>
              <h2><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2><p>{post.excerpt}</p>
              <Link className="bt-blog-read" href={`/blog/${post.slug}`}>Read the story →</Link>
            </article>)}</section>}
          <p className="bt-blog-sample-note">Sample Journal · entries here are isolated preview content, not live posts.</p>
        </>}
    </main>
  );
}
