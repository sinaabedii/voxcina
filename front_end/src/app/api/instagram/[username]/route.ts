import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  const { username } = params;
  const { searchParams } = new URL(request.url);
  const count = parseInt(searchParams.get("count") || "6");

  try {
    console.log(`Fetching Instagram posts for: ${username}`);

    const proxyUrls = [
      "https://api.allorigins.win/get?url=",
      "https://cors-anywhere.herokuapp.com/",
      "https://thingproxy.freeboard.io/fetch/",
    ];

    const instagramUrls = [
      `https://www.instagram.com/${username}/?__a=1&__d=dis`,
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
    ];

    for (const proxyUrl of proxyUrls) {
      for (const instagramUrl of instagramUrls) {
        try {
          const fullUrl = proxyUrl + encodeURIComponent(instagramUrl);
          console.log(`Trying: ${fullUrl}`);

          const response = await fetch(fullUrl, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
              Accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.5",
              "Accept-Encoding": "gzip, deflate",
              DNT: "1",
              Connection: "keep-alive",
              "Upgrade-Insecure-Requests": "1",
            },
            next: { revalidate: 1800 },
          });

          if (response.ok) {
            const text = await response.text();
            let data;

            try {
              const parsed = JSON.parse(text);
              data = parsed.contents ? JSON.parse(parsed.contents) : parsed;
            } catch {
              continue;
            }

            let posts = [];

            if (data.graphql?.user?.edge_owner_to_timeline_media?.edges) {
              posts = data.graphql.user.edge_owner_to_timeline_media.edges
                .slice(0, count)
                .map((edge: any) => ({
                  id: edge.node.id,
                  media_type: edge.node.is_video ? "VIDEO" : "IMAGE",
                  media_url: edge.node.display_url,
                  thumbnail_url: edge.node.thumbnail_src,
                  permalink: `https://www.instagram.com/p/${edge.node.shortcode}/`,
                  caption:
                    edge.node.edge_media_to_caption?.edges[0]?.node?.text || "",
                  timestamp: new Date(
                    edge.node.taken_at_timestamp * 1000
                  ).toISOString(),
                  like_count: edge.node.edge_liked_by?.count,
                  comments_count: edge.node.edge_media_to_comment?.count,
                }));
            } else if (data.data?.user?.edge_owner_to_timeline_media?.edges) {
              posts = data.data.user.edge_owner_to_timeline_media.edges
                .slice(0, count)
                .map((edge: any) => ({
                  id: edge.node.id,
                  media_type: edge.node.is_video ? "VIDEO" : "IMAGE",
                  media_url: edge.node.display_url,
                  thumbnail_url: edge.node.thumbnail_src,
                  permalink: `https://www.instagram.com/p/${edge.node.shortcode}/`,
                  caption:
                    edge.node.edge_media_to_caption?.edges[0]?.node?.text || "",
                  timestamp: new Date(
                    edge.node.taken_at_timestamp * 1000
                  ).toISOString(),
                  like_count: edge.node.edge_liked_by?.count,
                  comments_count: edge.node.edge_media_to_comment?.count,
                }));
            }

            if (posts.length > 0) {
              console.log(`Successfully fetched ${posts.length} posts`);
              return NextResponse.json({
                posts,
                source: "instagram_api",
                success: true,
                timestamp: new Date().toISOString(),
              });
            }
          }
        } catch (error) {
          console.log(`Failed with ${proxyUrl}:`, error);
          continue;
        }
      }
    }

    console.log("All methods failed, using fallback data");

    const fallbackPosts = generateFallbackPosts(username, count);

    return NextResponse.json({
      posts: fallbackPosts,
      source: "fallback",
      success: true,
      message: "Using fallback data due to Instagram API restrictions in Iran",
    });
  } catch (error) {
    console.error("Instagram API Error:", error);

    return NextResponse.json({
      posts: generateFallbackPosts(username, count),
      source: "fallback",
      success: false,
      error: "Failed to fetch Instagram posts",
    });
  }
}

function generateFallbackPosts(username: string, count: number) {
  const voxcinaImages = [
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=400&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=400&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&h=400&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=400&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&h=400&fit=crop&crop=face",
  ];

  const voxcinaCaptions = [
    "✨ کالکشن جدید پاییز وکسینا ✨ رنگ‌های گرم و طراحی‌های منحصربفرد برای شما عزیزان 🍂 #وکسینا #فشن #استایل",
    "🌟 استایل اداری شیک برای خانم‌های موفق 💼 ترکیب عالی از راحتی و زیبایی در یک طراحی",
    "🎨 ترکیب رنگ‌های زیبا برای فصل پاییز 🧡 با الهام از طبیعت و ترندهای جهانی مد",
    "💫 جدیدترین ترندهای مد و لباس 👗 طراحی شده برای زنان مدرن و شیک پوش",
    "🌸 طراحی‌های منحصربفرد برای شما 💖 کیفیت برتر و جنس فوق‌العاده",
    "✨ زیبایی در سادگی، کیفیت در جزئیات 🌟 وکسینا همیشه در کنار شما",
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `voxcina_${i + 1}`,
    media_type: "IMAGE" as const,
    media_url: voxcinaImages[i % voxcinaImages.length],
    permalink: `https://instagram.com/voxcina`,
    caption: voxcinaCaptions[i % voxcinaCaptions.length],
    timestamp: new Date(
      Date.now() - (i + 1) * 24 * 60 * 60 * 1000
    ).toISOString(),
    like_count: Math.floor(Math.random() * 400) + 150,
    comments_count: Math.floor(Math.random() * 40) + 8,
  }));
}
