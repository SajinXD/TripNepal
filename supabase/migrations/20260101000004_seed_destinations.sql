

INSERT INTO public.destinations (
  id, name, district, province, description, short_desc,
  category, lat, lng, elevation_m, entry_fee_npr,
  best_season, avg_visit_hrs, is_active
) VALUES

(
  'a1b2c3d4-0001-0000-0000-000000000001',
  'Pashupatinath Temple',
  'Kathmandu', 'Bagmati',
  'Pashupatinath Temple is a famous and sacred Hindu temple dedicated to Lord Shiva, located on the banks of the Bagmati River. It is one of the most important Hindu pilgrimage sites in South Asia and a UNESCO World Heritage Site. The temple complex includes numerous smaller temples and cremation ghats.',
  'Sacred Hindu temple & UNESCO World Heritage Site on the Bagmati River.',
  ARRAY['religious', 'cultural']::trip_category[],
  27.7104, 85.3487, 1336,
  1000,  
  ARRAY['October', 'November', 'December', 'January', 'February', 'March'],
  3.0, TRUE
),

(
  'a1b2c3d4-0002-0000-0000-000000000002',
  'Boudhanath Stupa',
  'Kathmandu', 'Bagmati',
  'Boudhanath is one of the largest stupas in the world and a major Buddhist pilgrimage site. The stupa''s all-seeing eyes of Buddha make it one of the most recognizable icons of Nepal. The surrounding area is filled with Tibetan monasteries, shops, and restaurants, creating a vibrant spiritual atmosphere.',
  'One of the world''s largest stupas & iconic Buddhist pilgrimage site.',
  ARRAY['religious', 'cultural', 'photography']::trip_category[],
  27.7215, 85.3620, 1400,
  400,
  ARRAY['October', 'November', 'December', 'January', 'February', 'March', 'April'],
  2.5, TRUE
),

(
  'a1b2c3d4-0003-0000-0000-000000000003',
  'Swayambhunath Stupa',
  'Kathmandu', 'Bagmati',
  'Swayambhunath, known as the Monkey Temple, is an ancient religious complex atop a hill in the Kathmandu Valley. The complex is one of the oldest religious sites in Nepal and offers panoramic views of the Kathmandu Valley. It is sacred to both Buddhists and Hindus.',
  'Ancient hilltop stupa offering panoramic Kathmandu Valley views.',
  ARRAY['religious', 'cultural', 'photography', 'city_tour']::trip_category[],
  27.7149, 85.2904, 1336,
  200,
  ARRAY['October', 'November', 'December', 'January', 'February', 'March', 'April', 'May'],
  2.0, TRUE
),

(
  'a1b2c3d4-0004-0000-0000-000000000004',
  'Phewa Lake & Pokhara Lakeside',
  'Kaski', 'Gandaki',
  'Phewa Lake is the second largest lake in Nepal, located in Pokhara. The lake offers stunning reflections of the Annapurna mountain range and the Phewa Tal Barahi Temple on an island. Pokhara Lakeside is a tourist hub known for its scenic beauty, adventure sports, and gateway to Annapurna trekking.',
  'Serene lake with Annapurna reflections & adventure sports gateway.',
  ARRAY['adventure', 'photography', 'trekking', 'cultural']::trip_category[],
  28.2096, 83.9509, 742,
  0,
  ARRAY['October', 'November', 'December', 'January', 'February', 'March', 'April'],
  4.0, TRUE
),

(
  'a1b2c3d4-0005-0000-0000-000000000005',
  'Annapurna Base Camp',
  'Kaski', 'Gandaki',
  'Annapurna Base Camp (ABC) sits at 4,130m in the heart of the Annapurna Sanctuary. The trek offers stunning views of Annapurna I, Machapuchare (Fishtail), Hiunchuli, and other Himalayan peaks. The route passes through diverse landscapes including rhododendron forests, rice paddies, and alpine terrain.',
  'High-altitude base camp trek with stunning Himalayan panoramas.',
  ARRAY['trekking', 'adventure', 'photography', 'wildlife']::trip_category[],
  28.5302, 83.8773, 4130,
  3000,  
  ARRAY['October', 'November', 'December', 'March', 'April', 'May'],
  8.0, TRUE
),

(
  'a1b2c3d4-0006-0000-0000-000000000006',
  'Chitwan National Park',
  'Chitwan', 'Madhesh',
  'Chitwan National Park is Nepal''s first national park and a UNESCO World Heritage Site. Home to the one-horned rhino, Bengal tiger, gharial crocodile, and hundreds of bird species, it offers jeep safaris, elephant-back safaris, canoe rides, and jungle walks. The Tharu villages surrounding the park offer rich cultural experiences.',
  'UNESCO World Heritage wilderness with rhinos, tigers & elephant safaris.',
  ARRAY['wildlife', 'adventure', 'photography', 'cultural']::trip_category[],
  27.5291, 84.4333, 150,
  1500,
  ARRAY['October', 'November', 'December', 'January', 'February', 'March', 'April'],
  6.0, TRUE
),

(
  'a1b2c3d4-0007-0000-0000-000000000007',
  'Lumbini — Birthplace of Buddha',
  'Rupandehi', 'Lumbini',
  'Lumbini is the birthplace of Siddhartha Gautama, who became the Buddha. It is a UNESCO World Heritage Site and one of the most sacred places in the world for Buddhists. The Lumbini Garden contains the Maya Devi Temple, the sacred Bodhi tree, the Ashoka Pillar, and the sacred pool. The monastic zone features temples built by countries around the world.',
  'UNESCO-listed birthplace of the Buddha with international monasteries.',
  ARRAY['religious', 'cultural', 'photography']::trip_category[],
  27.4833, 83.2764, 150,
  500,
  ARRAY['October', 'November', 'December', 'January', 'February', 'March', 'April', 'May'],
  5.0, TRUE
),

(
  'a1b2c3d4-0008-0000-0000-000000000008',
  'Everest Base Camp',
  'Solukhumbu', 'Koshi',
  'Everest Base Camp (EBC) at 5,364m is the most iconic trek in the world. The route from Lukla passes through Sherpa villages, high-altitude monasteries (Tengboche), glacial moraines, and yak pastures. The trek offers views of Everest, Lhotse, Nuptse, Ama Dablam, and dozens of other Himalayan peaks.',
  'World-famous trek to the base of the highest mountain on Earth.',
  ARRAY['trekking', 'adventure', 'photography']::trip_category[],
  27.9946, 86.8527, 5364,
  7500,  
  ARRAY['March', 'April', 'May', 'October', 'November'],
  14.0, TRUE
);
