import Link from 'next/link';
import { getSortedPostsData } from '@/lib/posts';

export default async function BlogPage() {
  const posts = await getSortedPostsData();

  return (
    <div className="container mx-auto py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Blog</h1>
      <div className="space-y-8">
        {posts.map((post) => (
          <article key={post.slug} className="border-b pb-8">
            <Link href={`/blog/${post.slug}`}>
              <h2 className="text-2xl font-bold hover:underline mb-2">{post.title}</h2>
            </Link>
            <p className="text-muted-foreground mb-4">{post.date}</p>
            <p>{post.excerpt}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
