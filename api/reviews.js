export const config = { runtime: 'edge' };

export default async function handler(req) {
  const apiKey = process.env.GOOGLE_PLACES_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    // Step 1: Find the place by name
    const searchUrl = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json'
      + '?input=Tolliver+Timepieces+Conway+Arkansas'
      + '&inputtype=textquery'
      + '&fields=place_id'
      + '&key=' + apiKey;

    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.candidates || !searchData.candidates[0]) {
      return new Response(JSON.stringify({ error: 'Business not found', debug: searchData }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const placeId = searchData.candidates[0].place_id;

    // Step 2: Get reviews
    const detailsUrl = 'https://maps.googleapis.com/maps/api/place/details/json'
      + '?place_id=' + placeId
      + '&fields=name,rating,user_ratings_total,reviews'
      + '&reviews_sort=newest'
      + '&key=' + apiKey;

    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();

    if (!detailsData.result) {
      return new Response(JSON.stringify({ error: 'No details found', debug: detailsData }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const place = detailsData.result;

    const payload = {
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
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=3600'
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
