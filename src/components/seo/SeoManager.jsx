import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useStore } from "../../store/storeModel";

const DEFAULT_TITLE = "Star Ranker | Real-Time Cultural Prediction Markets";
const DEFAULT_DESCRIPTION =
  "Track and predict rankings across crypto, music, sports, fashion, games, and more on Star Ranker.";
const SITE_NAME = "Star Ranker";
const DEFAULT_IMAGE = "https://star-ranker.vercel.app/favicon.png";

function upsertMeta(name, content, attr = "name") {
  let tag = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function upsertCanonical(url) {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", url);
}

function upsertJsonLd(id, payload) {
  let script = document.head.querySelector(`script[data-seo-id="${id}"]`);
  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-seo-id", id);
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(payload);
}

function toTitleCase(slug = "") {
  return slug
    .split("-")
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function getSeoForPath(pathname, categories, items) {
  const noIndexPaths = ["/signin", "/signup", "/admin", "/dashboard", "/settings", "/portfolio", "/notifications"];
  const noIndex = noIndexPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (pathname === "/") {
    return {
      title: DEFAULT_TITLE,
      description:
        "Vote, rank, and stake on markets across crypto, tech, entertainment, fashion, and sports with live oracle updates.",
      noIndex,
    };
  }

  if (pathname === "/markets" || pathname.startsWith("/category/")) {
    const slug = pathname.startsWith("/category/") ? pathname.replace("/category/", "") : null;
    const category = slug ? categories.find((c) => c.slug === slug) : null;
    const categoryTitle = category?.title || (slug ? `${toTitleCase(slug)} Markets` : "Markets");
    return {
      title: `${categoryTitle} | Star Ranker`,
      description: category?.description || `Live rankings, momentum shifts, and prediction markets for ${categoryTitle}.`,
      noIndex,
    };
  }

  if (pathname.startsWith("/market/")) {
    const id = pathname.replace("/market/", "");
    const market = items.find((i) => String(i.id) === id || i.docId === id);
    const name = market?.name || "Market";
    return {
      title: `${name} Market | Star Ranker`,
      description: `View live ranking movement, activity, and prediction opportunities for ${name} on Star Ranker.`,
      noIndex,
    };
  }

  if (pathname === "/history") {
    return {
      title: "Epoch History & Snapshots | Star Ranker",
      description: "Browse immutable epoch snapshots, historical rankings, and market state archives.",
      noIndex,
    };
  }

  if (pathname === "/leaderboards") {
    return {
      title: "Leaderboards | Star Ranker",
      description: "See top performers, reputation leaders, and ranking momentum across Star Ranker markets.",
      noIndex,
    };
  }

  return { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, noIndex };
}

export default function SeoManager() {
  const location = useLocation();
  const categories = useStore((s) => s.categories || []);
  const items = useStore((s) => s.items || []);

  useEffect(() => {
    const origin = window.location.origin;
    const canonicalUrl = `${origin}${location.pathname}`;
    const seo = getSeoForPath(location.pathname, categories, items);

    document.title = seo.title;
    upsertCanonical(canonicalUrl);
    upsertMeta("description", seo.description);
    upsertMeta("robots", seo.noIndex ? "noindex,nofollow" : "index,follow");

    upsertMeta("og:type", "website", "property");
    upsertMeta("og:site_name", SITE_NAME, "property");
    upsertMeta("og:title", seo.title, "property");
    upsertMeta("og:description", seo.description, "property");
    upsertMeta("og:url", canonicalUrl, "property");
    upsertMeta("og:image", DEFAULT_IMAGE, "property");

    upsertMeta("twitter:card", "summary_large_image");
    upsertMeta("twitter:title", seo.title);
    upsertMeta("twitter:description", seo.description);
    upsertMeta("twitter:image", DEFAULT_IMAGE);

    upsertJsonLd("website", {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: origin,
      potentialAction: {
        "@type": "SearchAction",
        target: `${origin}/markets?query={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    });
  }, [location.pathname, categories, items]);

  return null;
}
