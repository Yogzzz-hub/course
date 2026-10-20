import { AnimatedText } from '../components/AnimatedText';
import { Mail, Phone, MapPin, Navigation, ArrowUpRight } from 'lucide-react';
import { academy } from '../config/academy';
import { PageHero, Button, Accordion } from '../components/ui';
import { EnquiryForm } from '../components/EnquiryForm';
import { faqs } from '../data/faqs';

export default function Contact() {
  return (
    <>
      <PageHero
        labels={['Ask', 'Discuss']}
        title={
          <>
            A good next step<br />
            <span className="muted">starts with a question.</span>
          </>
        }
        description="Ask about the programme, discuss your learning goals or find a little more clarity before you decide."
      />

      <section className="container section section-first contact-layout">
        <div>
          <h2><AnimatedText>Find your direction.</AnimatedText></h2>
          <p>
            Whether you're exploring a new field or looking to deepen your skills, bring your questions about curriculum, packages and the learning experience.
          </p>

          {academy.email && (
            <a className="contact-link" href={`mailto:${academy.email}`} aria-label={`Email ${academy.email}`}>
              <Mail size={20} aria-hidden="true" />
              <span>{academy.email}</span>
            </a>
          )}

          {academy.phone && (
            <a className="contact-link" href={`tel:${academy.phone}`} aria-label={`Call ${academy.phone}`}>
              <Phone size={20} aria-hidden="true" />
              <span>{academy.phone}</span>
            </a>
          )}

          {academy.address && (
            <div className="contact-address-card">
              <div className="contact-address-header">
                <MapPin size={20} aria-hidden="true" />
                <div className="contact-address-details">
                  <strong>Campus Address</strong>
                  <address className="not-italic">{academy.address}</address>
                </div>
              </div>
              {academy.googleMapsUrl && (
                <a
                  className="contact-map-btn"
                  href={academy.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open Aintrix Academy campus location in Google Maps"
                >
                  <Navigation size={15} aria-hidden="true" />
                  <span>Open in Google Maps</span>
                  <ArrowUpRight size={14} aria-hidden="true" />
                </a>
              )}
            </div>
          )}

          {!academy.email && !academy.phone && !academy.address && (
            <p className="small">Direct email and phone contact details will be published when confirmed.</p>
          )}

          <div className="contact-call" data-tilt="6">
            <h3>Prefer a conversation?</h3>
            <p>Explore one-on-one counselling and what to discuss.</p>
            <Button to="/book-session" secondary>Explore counselling</Button>
          </div>
        </div>

        <EnquiryForm />
      </section>

      {academy.address && academy.googleMapsEmbedUrl && (
        <section className="container section campus-map-section" aria-label="Campus location and directions">
          <div className="section-top">
            <div>
              <span className="eyebrow">Location</span>
              <h2>
                <AnimatedText>
                  Visit our campus.<br />
                  <span className="muted">In the heart of Chennai.</span>
                </AnimatedText>
              </h2>
              <p className="section-intro">
                Conveniently located on Ramakrishna Mutt Road in Mandaveli, Chennai. Walk in during office hours or book a counselling call in advance.
              </p>
            </div>
          </div>

          <div className="map-embed-wrapper">
            <div className="map-embed-header">
              <div className="map-embed-title">
                <MapPin size={18} aria-hidden="true" />
                <span>{academy.address}</span>
              </div>
              {academy.googleMapsUrl && (
                <a
                  href={academy.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="map-open-link"
                  aria-label="Open full campus map in Google Maps"
                >
                  Open in Google Maps <ArrowUpRight size={14} aria-hidden="true" />
                </a>
              )}
            </div>
            <div className="map-frame-container">
              <iframe
                title="Aintrix Academy Google Maps Location"
                src={academy.googleMapsEmbedUrl}
                width="100%"
                height="420"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </section>
      )}

      <section id="faqs" className="section container faq-section">
        <div>
          <h2>
            <AnimatedText>
              Good questions.<br />
              <span className="muted">Straight answers.</span>
            </AnimatedText>
          </h2>
          <p>Still deciding? Start here.</p>
        </div>
        <Accordion items={faqs} />
      </section>
    </>
  );
}

