import { getPostData } from '@/lib/posts';

export default async function Post({ params }: { params: { slug: string } }) {
  const postData = await getPostData(params.slug);

  return (
    <article className="container mx-auto py-12 max-w-2xl">
      <h1 className="text-4xl font-bold mb-4">{postData.title}</h1>
      <p className="text-muted-foreground mb-8">{postData.date}</p>
      <div 
        className="prose dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: postData.contentHtml }} 
      />
    </article>
  );
}
