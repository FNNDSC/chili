import fetch from 'node-fetch';

export async function fetchFeed(url: string) {
  const response = await fetch(url);
  const data = await response.text();
  return data;
}

