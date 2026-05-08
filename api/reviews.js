export default async function handler(req, res) {
  // Allow CORS from tollivertime.com
  res.setHeader('Access-Control-Allow-Origin', 'https://tollivertime.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=3600'); // cache for 1 hour

  const apiKey = process.env.GOOGLE_PLACES_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Step 1: Find the place ID by name
    const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json`
      + `?input=Tolliver+Timepieces+Conway+Arkansas`
      + `&inputtype=textquery`
      + `&fields=place_id`
      + `&key=${apiKey}`;

    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.candidates || !searchData.candidates[0]) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const placeId = searchData.candidates[0].place_id;

    // Step 2: Get place details including reviews
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json`
      + `?place_id=${placeId}`
      + `&fields=name,rating,user_ratings_total,reviews`
      + `&reviews_sort=newest`
      + `&key=${apiKey}`;

    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();

    if (!detailsData.result) {
      return res.status(404).json({ error: 'Place details not found' });
    }

    const place = detailsData.result;

    return res.status(200).json({
      name: place.name,
      rating: place.rating,
      total: place.user_ratings_total,
      reviews: (place.reviews || []).map(r => ({
        author: r.author_name,
        photo: r.profile_photo_url || null,
        rating: r.rating,
        text: r.text,
        time: r.relative_time_description,
      }))
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
