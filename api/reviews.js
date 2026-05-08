export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=3600');

  const apiKey = process.env.GOOGLE_PLACES_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Step 1: Find the place using phone number for accuracy
    const searchUrl = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json'
      + '?input=Tolliver+Timepieces'
      + '&inputtype=textquery'
      + '&locationbias=circle:50000@35.0887,-92.4421'
      + '&fields=place_id,name'
      + '&key=' + apiKey;

    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.candidates || !searchData.candidates.length) {
      return res.status(200).json({ error: 'Business not found', raw: searchData });
    }

    const placeId = searchData.candidates[0].place_id;

    // Step 2: Get place details + reviews
    const detailsUrl = 'https://maps.googleapis.com/maps/api/place/details/json'
      + '?place_id=' + placeId
      + '&fields=name,rating,user_ratings_total,reviews'
      + '&reviews_sort=newest'
      + '&key=' + apiKey;

    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();

    if (!detailsData.result) {
      return res.status(200).json({ error: 'No details', raw: detailsData });
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
