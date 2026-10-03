import Link from "next/link";
import {
  Calculator,
  HeartHandshake,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { Brand } from "@/components/brand";

const offers = [
  {
    icon: HeartHandshake,
    title: "Personal guidance",
    text: "Start with your family and priorities.",
    href: "/conversation",
  },
  {
    icon: Calculator,
    title: "Clear coverage math",
    text: "See your needs and what’s already covered.",
    href: "/conversation",
  },
  {
    icon: ShieldCheck,
    title: "Understand your options",
    text: "Explore term, whole life, and the tradeoffs.",
    href: "/conversation?learn=true",
  },
  {
    icon: SlidersHorizontal,
    title: "Explore what-ifs",
    text: "See what changes when your plans do.",
    href: "/conversation",
  },
];

export default function Home() {
  return (
    <div className="overview-page">
      <header className="overview-header">
        <Brand />
      </header>
      <main id="main" className="overview-main">
        <section className="overview-intro">
          <div className="eyebrow">A LITTLE CLARITY. A LOT OF CARE.</div>
          <h1>
            Protect what matters.
            <br />
            <span>Understand your options.</span>
          </h1>
        </section>
        <section id="mission" className="overview-mission">
          <h2>Our mission</h2>
          <p>
            Make life insurance easier to understand, with personal guidance and
            math you can follow.
          </p>
        </section>
        <section id="offer" className="overview-offers">
          <h2>What we offer</h2>
          <div className="overview-offer-grid">
            {offers.map(({ icon: Icon, title, text, href }) => (
              <Link href={href} className="overview-offer" key={title}>
                <Icon size={22} strokeWidth={1.5} />
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
        <div className="overview-actions">
          <Link className="btn btn-primary" href="/conversation">
            Start a conversation
          </Link>
        </div>
      </main>
      <footer className="overview-footer">
        Educational guidance. Estimates are not policy quotes.
      </footer>
    </div>
  );
}
