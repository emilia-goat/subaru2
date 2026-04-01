const Index = () => {
  return (
    <iframe
      src="/koma-os.html"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        border: 'none',
        margin: 0,
        padding: 0,
      }}
      title="KomaOS"
      allowFullScreen
      allow="camera; microphone; accelerometer; gyroscope; bluetooth; geolocation"
    />
  );
};

export default Index;
