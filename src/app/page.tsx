import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  Check,
  HeartHandshake,
  House,
  MessageCircle,
  MoveUpRight,
  ShieldCheck,
  SlidersHorizontal,
  Sprout,
  Calculator,
  Users,
} from "lucide-react";
import { Brand } from "@/components/brand";

const offers = [
  {
    icon: HeartHandshake,
    title: "Guidance shaped around you",
    text: "Your family, responsibilities, and goals guide the conversation.",
    tag: "PERSONAL BY DESIGN",
  },
  {
    icon: Calculator,
    title: "Math you can follow",
    text: "Understand what is included and how existing coverage counts.",
    tag: "EVERY NUMBER, EXPLAINED",
  },
  {
    icon: ShieldCheck,
    title: "Term and whole life, explained",
    text: "Explore the differences and tradeoffs for your situation.",
    tag: "CLARITY OVER COMPLEXITY",
  },
  {
    icon: SlidersHorizontal,
    title: "What-if conversations",
    text: "See what changes when your plans or circumstances change.",
    tag: "ROOM TO EXPLORE",
  },
];
export default function Home() {
  return (
    <>
      <header className="site-header">
        <nav className="container nav" aria-label="Main navigation">
          <Brand />
          <div className="nav-links">
            <a href="#mission">Our mission</a>
            <a href="#offer">What we offer</a>
          </div>
          <Link className="btn btn-primary nav-cta" href="/conversation">
            Start a conversation <ArrowRight size={15} />
          </Link>
        </nav>
      </header>
      <main id="main">
        <section className="hero container">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="small-line" /> A LITTLE CLARITY. A LOT OF CARE.
            </div>
            <h1>
              Protect what matters.
              <br />
              <span>
                Understand
                <br className="desktop-break" /> your options.
              </span>
            </h1>
            <p className="hero-description">
              A thoughtful conversation can help you understand your life
              insurance needs, one step at a time.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/conversation">
                <AudioLines size={18} />
                Start a conversation
                <ArrowRight size={17} />
              </Link>
              <Link className="text-link" href="/conversation?mode=text">
                I prefer to type <ArrowRight size={15} />
              </Link>
            </div>
            <div className="hero-reassurance">
              <ShieldCheck size={15} />
              <span>No pressure. No policy sales. Just a clearer picture.</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="conversation-preview">
              <div className="preview-top">
                <div className="avatar">
                  <Sprout size={21} />
                </div>
                <div>
                  <strong>Your Steady companion</strong>
                  <span>Here to help you think it through</span>
                </div>
                <span className="preview-status">LET’S BEGIN</span>
              </div>
              <div className="preview-body">
                <div className="mini-label">ONE QUESTION AT A TIME</div>
                <h2>
                  Every family has
                  <br />a different story.
                </h2>
                <p>
                  What would you want life insurance to help your family with?
                </p>
                <div className="topic-options">
                  <Link href="/conversation?intent=everyday">
                    <span>
                      <HeartHandshake size={18} />
                      Everyday expenses
                    </span>
                    <ArrowRight size={16} />
                  </Link>
                  <Link href="/conversation?intent=mortgage">
                    <span>
                      <House size={18} />A mortgage
                    </span>
                    <ArrowRight size={16} />
                  </Link>
                  <Link href="/conversation?intent=children">
                    <span>
                      <Sprout size={18} />
                      My children’s future
                    </span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
                <span className="preview-footnote">
                  There’s no perfect answer. We’ll start with what matters to
                  you.
                </span>
              </div>
              <div className="preview-bottom">
                <MessageCircle size={15} /> A conversation, at your pace{" "}
                <span className="dots">•••</span>
              </div>
            </div>
            <div className="floating-note">
              <span className="check-circle">
                <Check size={14} />
              </span>
              <div>
                <strong>Your life. Your priorities.</strong>
                <span>A little more understood.</span>
              </div>
            </div>
          </div>
        </section>
        <div className="principles">
          <div className="container principles-inner">
            <span>
              <Users size={17} /> Shaped around your family
            </span>
            <span>
              <Calculator size={17} /> Grounded in transparent math
            </span>
            <span>
              <MessageCircle size={17} /> Made for real conversations
            </span>
          </div>
        </div>
        <section id="mission" className="container mission-section">
          <div>
            <div className="eyebrow">OUR MISSION</div>
            <h2>
              Big decisions deserve
              <br />a human conversation.
            </h2>
          </div>
          <div className="mission-copy">
            <p>
              Make life insurance easier to understand, so people can explore
              protection for their families with clarity and confidence.
            </p>
            <p className="muted">
              Personal questions. Transparent math.
              <br />A pace that works for you.
            </p>
            <a className="text-link orange" href="#offer">
              A thoughtful way forward <ArrowRight size={16} />
            </a>
          </div>
        </section>
        <section id="offer" className="offers-section">
          <div className="container">
            <div className="section-heading">
              <div>
                <div className="eyebrow">WHAT WE OFFER</div>
                <h2>
                  From “where do I start?”
                  <br />
                  to “that makes sense.”
                </h2>
              </div>
              <p>
                A little guidance for the questions
                <br />
                that don’t always have simple answers.
              </p>
            </div>
            <div className="offer-grid">
              {offers.map(({ icon: Icon, title, text, tag }) => (
                <Link
                  key={title}
                  className="offer-card"
                  href={
                    title.startsWith("Term")
                      ? "/conversation?learn=true"
                      : "/conversation"
                  }
                >
                  <div className="offer-icon">
                    <Icon size={23} strokeWidth={1.5} />
                  </div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <div className="offer-bottom">
                    <span>{tag}</span>
                    <MoveUpRight size={16} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <section className="container closing-section">
          <div className="closing-icon">
            <Sprout size={28} strokeWidth={1.4} />
          </div>
          <h2>A clearer picture starts here.</h2>
          <p>
            You bring your story. We’ll help you make sense of the next step.
          </p>
          <Link className="btn btn-primary" href="/conversation">
            Explore my needs <ArrowRight size={17} />
          </Link>
          <span className="closing-note">
            Take your time. We’re here when you’re ready.
          </span>
        </section>
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <Brand />
          <p>Educational guidance. Estimates are not policy quotes.</p>
          <span>Built with care · CodeLinc 11</span>
        </div>
      </footer>
    </>
  );
}
