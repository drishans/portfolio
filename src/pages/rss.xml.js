import rss from '@astrojs/rss';
import { SITE } from '../consts';
import { getPublished, byDate } from '../utils';

export async function GET(context) {
  const posts = (await getPublished('writing')).sort(byDate);
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/writing/${post.id}/`,
      categories: post.data.tags,
    })),
  });
}
