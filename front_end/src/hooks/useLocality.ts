import { useState, useEffect } from 'react';

export interface Province {
  province_code: number;
  province_name: string;
}

export interface City {
  city_code: number;
  city_name: string;
}

// Hook to fetch provinces and cities from our API
export function useLocality() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    fetchProvinces();
  }, []);

  const fetchProvinces = async () => {
    setLoadingProvinces(true);
    try {
      const response = await fetch('/api/postex/locality/provinces');
      const resJson = await response.json();
      const list = Array.isArray(resJson)
        ? resJson
        : resJson.data || [];
      if (Array.isArray(list)) {
        setProvinces(list);
      } else {
        console.error('Invalid provinces response:', resJson);
      }
    } catch (error) {
      console.error('Error fetching provinces:', error);
    } finally {
      setLoadingProvinces(false);
    }
  };

  const fetchCities = async (provinceCode: number) => {
    setLoadingCities(true);
    try {
      const response = await fetch(`/api/postex/locality/cities/${provinceCode}`);
      const resJson = await response.json();
      const list = Array.isArray(resJson)
        ? resJson
        : resJson.data || [];
      if (Array.isArray(list)) {
        setCities(list);
      } else {
        console.error('Invalid cities response:', resJson);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    } finally {
      setLoadingCities(false);
    }
  };

  return { provinces, cities, fetchCities, loadingProvinces, loadingCities };
} 