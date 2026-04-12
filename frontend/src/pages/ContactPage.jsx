function ContactPage() {
  return (
    <main className="container section-space">
      <h1>Contact Market Mizan</h1>
      <p className="detail-subtitle">
        Have a question, partnership request, or listing issue? Reach out to us.
      </p>
      <div className="details-grid">
        <div className="panel">
          <h3>General</h3>
          <p>Email: hello@mmizan.com</p>
          <p>Phone: +251 90 000 0000</p>
          <p>Office: Addis Ababa, Ethiopia</p>
        </div>
        <div className="panel">
          <h3>Business Hours</h3>
          <p>Monday - Friday: 09:00 - 18:00</p>
          <p>Saturday: 09:00 - 14:00</p>
          <p>Sunday: Closed</p>
        </div>
      </div>
      <div className="panel">
        <h3>Send us a message</h3>
        <p>For now, please contact us via email. A full contact form is coming soon.</p>
      </div>
    </main>
  );
}

export default ContactPage;
