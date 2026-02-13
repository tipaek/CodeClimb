INSERT INTO problems (neet250_id, title, category, order_index)
VALUES
    (1, 'Two Sum', 'Arrays & Hashing', 1),
    (2, 'Valid Parentheses', 'Stack', 2),
    (3, 'Binary Search', 'Binary Search', 3)
ON CONFLICT (neet250_id) DO NOTHING;
