-- ============================================================
-- E-commerce Query Bank for sql-sage
-- Database: ecommerce_demo
--
-- 50 queries organized in 3 tiers:
--   TIER 1 (GOOD):   15 queries — indexed, efficient, LIMIT
--   TIER 2 (MEDIUM): 15 queries — partial issues
--   TIER 3 (BAD):    20 queries — anti-patterns, full scans
--
-- Each query is annotated with:
--   [Heuristic rules triggered]
--   [ML features activated]
-- ============================================================


-- ===========================================================
-- TIER 1: GOOD QUERIES (expected score 70-100%)
-- Indexed lookups, specific columns, LIMIT, efficient JOINs
-- ===========================================================

-- Q01: PK lookup — single row, fastest possible
-- [Rules: none] [Features: tableCount=1, hasLimit=0]
SELECT id, name, email, city, state FROM customers WHERE id = 42;

-- Q02: Indexed range scan with LIMIT
-- [Rules: none] [Features: hasOrderBy=1, hasLimit=1, tableCount=1]
SELECT id, name, price, is_active FROM products WHERE is_active = 1 AND created_at > '2025-01-01' ORDER BY created_at DESC LIMIT 20;

-- Q03: Indexed JOIN with specific columns
-- [Rules: none] [Features: hasJoin=1, joinCount=1, tableCount=2, hasLimit=1]
SELECT o.id, o.status, o.total_amount, c.name FROM orders o INNER JOIN customers c ON o.customer_id = c.id WHERE o.customer_id = 100 ORDER BY o.created_at DESC LIMIT 10;

-- Q04: Covered index query (status + created_at)
-- [Rules: none] [Features: hasGroupBy=1, tableCount=1, hasLimit=1]
SELECT status, COUNT(*) AS cnt FROM orders WHERE created_at >= '2025-01-01' GROUP BY status LIMIT 10;

-- Q05: Indexed FK lookup
-- [Rules: none] [Features: hasJoin=1, joinCount=1, tableCount=2, hasLimit=1]
SELECT oi.quantity, oi.unit_price, p.name FROM order_items oi INNER JOIN products p ON oi.product_id = p.id WHERE oi.order_id = 500 LIMIT 50;

-- Q06: Payment lookup by indexed composite (method + status)
-- [Rules: none] [Features: tableCount=1, hasLimit=1]
SELECT id, order_id, amount, paid_at FROM payments WHERE method = 'pix' AND status = 'approved' LIMIT 20;

-- Q07: Category tree — self-join on indexed parent_id
-- [Rules: none] [Features: hasJoin=1, joinCount=1, tableCount=2, hasLimit=1]
SELECT c.name AS child, p.name AS parent FROM categories c LEFT JOIN categories p ON c.parent_id = p.id LIMIT 50;

-- Q08: Indexed customer state/city filter
-- [Rules: none] [Features: tableCount=1, hasOrderBy=1, hasLimit=1]
SELECT id, name, email FROM customers WHERE state = 'SP' AND city = 'Sao Paulo' ORDER BY created_at DESC LIMIT 15;

-- Q09: Simple aggregation on indexed column
-- [Rules: none] [Features: hasGroupBy=1, hasOrderBy=1, tableCount=1, hasLimit=1]
SELECT category_id, COUNT(*) AS total, AVG(price) AS avg_price FROM products WHERE is_active = 1 GROUP BY category_id ORDER BY total DESC LIMIT 10;

-- Q10: Efficient EXISTS subquery
-- [Rules: none] [Features: hasSubquery=1, subqueryCount=1, tableCount=2, hasLimit=1]
SELECT id, name, email FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.status = 'completed') LIMIT 20;

-- Q11: Indexed payment date range
-- [Rules: none] [Features: tableCount=1, hasOrderBy=1, hasLimit=1]
SELECT id, order_id, method, amount FROM payments WHERE paid_at BETWEEN '2025-06-01' AND '2025-06-30' ORDER BY paid_at LIMIT 50;

-- Q12: Efficient 2-table JOIN with WHERE on indexed column
-- [Rules: none] [Features: hasJoin=1, joinCount=1, tableCount=2, hasLimit=1, hasOrderBy=1]
SELECT r.rating, r.title, p.name FROM reviews r INNER JOIN products p ON r.product_id = p.id WHERE r.customer_id = 55 ORDER BY r.created_at DESC LIMIT 10;

-- Q13: COUNT with indexed WHERE
-- [Rules: none] [Features: hasCountStar=1, tableCount=1]
SELECT COUNT(*) FROM orders WHERE status = 'pending' AND created_at >= '2026-01-01';

-- Q14: Efficient IN clause on PK
-- [Rules: none] [Features: tableCount=1, hasLimit=1]
SELECT id, name, price FROM products WHERE id IN (1, 5, 10, 25, 50, 100) LIMIT 10;

-- Q15: Simple paginated listing
-- [Rules: none] [Features: hasOrderBy=1, hasLimit=1, tableCount=1]
SELECT id, name, slug, price FROM products WHERE category_id = 3 ORDER BY price ASC LIMIT 20;


-- ===========================================================
-- TIER 2: MEDIUM QUERIES (expected score 40-70%)
-- Partially optimized — one or two issues each
-- ===========================================================

-- Q16: SELECT * with single JOIN — unnecessary columns
-- [Rules: select-star-join, no-limit] [Features: selectStar=1, hasJoin=1, joinCount=1, tableCount=2]
SELECT * FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.status = 'completed';

-- Q17: GROUP BY on non-indexed column (rating)
-- [Rules: no-limit] [Features: hasGroupBy=1, hasOrderBy=1, tableCount=1]
SELECT rating, COUNT(*) AS cnt FROM reviews GROUP BY rating ORDER BY rating DESC;

-- Q18: OR on same column — could use IN()
-- [Rules: no-limit] [Features: hasOr=1, orConditionCount=2, tableCount=1]
SELECT id, name, price FROM products WHERE category_id = 1 OR category_id = 5 OR category_id = 10;

-- Q19: Subquery that could be a JOIN
-- [Rules: subquery-in-where, no-limit] [Features: hasSubquery=1, subqueryCount=1, tableCount=2]
SELECT id, name, email FROM customers WHERE id IN (SELECT customer_id FROM orders WHERE status = 'cancelled');

-- Q20: SELECT * single table without LIMIT
-- [Rules: no-limit] [Features: selectStar=1, tableCount=1]
SELECT * FROM products WHERE category_id = 3 ORDER BY created_at DESC;

-- Q21: LEFT JOIN with ORDER BY on non-indexed column
-- [Rules: no-limit] [Features: hasJoin=1, joinCount=1, tableCount=2, hasOrderBy=1, hasGroupBy=1]
SELECT p.name, COUNT(r.id) AS review_count FROM products p LEFT JOIN reviews r ON r.product_id = p.id GROUP BY p.id ORDER BY review_count DESC;

-- Q22: Aggregation without index support
-- [Rules: no-limit] [Features: hasJoin=1, joinCount=1, tableCount=2, hasGroupBy=1, hasOrderBy=1]
SELECT c.state, SUM(o.total_amount) AS revenue FROM orders o JOIN customers c ON o.customer_id = c.id GROUP BY c.state ORDER BY revenue DESC;

-- Q23: UNION without ALL
-- [Rules: union-without-all] [Features: hasUnion=1, tableCount=2, hasLimit=1]
SELECT id, name, email FROM customers WHERE state = 'SP' UNION SELECT id, name, email FROM customers WHERE state = 'RJ' LIMIT 50;

-- Q24: OR across same column (status), acceptable but no-limit
-- [Rules: no-limit] [Features: hasOr=1, orConditionCount=1, tableCount=1]
SELECT id, customer_id, total_amount FROM orders WHERE status = 'pending' OR status = 'processing';

-- Q25: Correlated subquery — acceptable for small results
-- [Rules: no-limit] [Features: hasSubquery=1, subqueryCount=1, tableCount=2]
SELECT p.id, p.name, (SELECT COUNT(*) FROM order_items oi WHERE oi.product_id = p.id) AS times_ordered FROM products p WHERE p.is_active = 1;

-- Q26: DISTINCT with ORDER BY
-- [Rules: distinct-order-by, no-limit] [Features: hasJoin=1, joinCount=1, tableCount=2, hasOrderBy=1]
SELECT DISTINCT c.state, c.city FROM customers c JOIN orders o ON o.customer_id = c.id ORDER BY c.state, c.city;

-- Q27: Date function in select (ok) but no LIMIT
-- [Rules: no-limit] [Features: hasGroupBy=1, hasOrderBy=1, tableCount=1]
SELECT DATE(created_at) AS order_date, COUNT(*) AS cnt FROM orders WHERE created_at >= '2025-01-01' GROUP BY DATE(created_at) ORDER BY order_date;

-- Q28: Three-table JOIN — slightly complex
-- [Rules: no-limit] [Features: hasJoin=1, joinCount=2, nestedJoinDepth=1, tableCount=3, hasGroupBy=1, hasOrderBy=1]
SELECT p.name, cat.name AS category, SUM(oi.quantity) AS total_sold FROM order_items oi JOIN products p ON oi.product_id = p.id JOIN categories cat ON p.category_id = cat.id GROUP BY p.id ORDER BY total_sold DESC;

-- Q29: Indexed but broad range scan
-- [Rules: no-limit] [Features: tableCount=1, hasOrderBy=1]
SELECT id, customer_id, status, total_amount FROM orders WHERE created_at >= '2024-01-01' ORDER BY total_amount DESC;

-- Q30: Subquery in SELECT (scalar)
-- [Rules: no-limit] [Features: hasSubquery=1, subqueryCount=1, tableCount=2, hasLimit=1]
SELECT o.id, o.total_amount, (SELECT c.name FROM customers c WHERE c.id = o.customer_id) AS customer_name FROM orders o WHERE o.status = 'completed' LIMIT 50;


-- ===========================================================
-- TIER 3: BAD QUERIES (expected score 0-40%)
-- Anti-patterns, full scans, dangerous patterns
-- ===========================================================

-- Q31: LIKE with leading wildcard — full table scan on products.name (no index)
-- [Rules: leading-wildcard, no-limit] [Features: hasLike=1, tableCount=1]
SELECT * FROM products WHERE name LIKE '%phone%';

-- Q32: Cartesian/cross join — implicit comma join without WHERE
-- [Rules: cartesian-product, no-limit] [Features: tableCount=2]
SELECT p.name, c.name FROM products p, categories c;

-- Q33: SELECT * with multiple JOINs
-- [Rules: select-star-join, no-limit] [Features: selectStar=1, hasJoin=1, joinCount=3, nestedJoinDepth=2, tableCount=4]
SELECT * FROM orders o JOIN customers c ON o.customer_id = c.id JOIN order_items oi ON oi.order_id = o.id JOIN products p ON oi.product_id = p.id WHERE o.status = 'completed';

-- Q34: UPDATE without WHERE — affects all rows
-- [Rules: no-where-mutation] [Features: tableCount=1]
UPDATE products SET stock_quantity = stock_quantity - 1;

-- Q35: OR across different columns — non-sargable
-- [Rules: or-different-columns, no-limit] [Features: hasOr=1, orConditionCount=1, tableCount=1]
SELECT id, name, email, phone FROM customers WHERE email = 'test@test.com' OR phone = '(11) 91234-5678';

-- Q36: Function on column in WHERE — prevents index usage
-- [Rules: function-on-column, no-limit] [Features: hasFunctionInWhere=1, tableCount=1]
SELECT id, customer_id, total_amount FROM orders WHERE YEAR(created_at) = 2025;

-- Q37: Subquery in WHERE — executed per row
-- [Rules: subquery-in-where, no-limit] [Features: hasSubquery=1, subqueryCount=1, tableCount=2]
SELECT id, name, price FROM products WHERE id IN (SELECT product_id FROM order_items WHERE quantity > 3);

-- Q38: COUNT(*) without WHERE — full table scan
-- [Rules: count-no-where, no-limit] [Features: hasCountStar=1, tableCount=1]
SELECT COUNT(*) FROM order_items;

-- Q39: Multiple OR on same column (3+) — should be IN()
-- [Rules: or-to-in, no-limit] [Features: hasOr=1, orConditionCount=4, tableCount=1]
SELECT id, name, price FROM products WHERE category_id = 1 OR category_id = 3 OR category_id = 5 OR category_id = 7 OR category_id = 9;

-- Q40: Deeply nested subqueries (3 levels)
-- [Rules: deep-subquery, no-limit] [Features: hasSubquery=1, subqueryCount=3, tableCount=3]
SELECT name FROM customers WHERE id IN (SELECT customer_id FROM orders WHERE id IN (SELECT order_id FROM order_items WHERE product_id IN (SELECT id FROM products WHERE price > 1000)));

-- Q41: UNION without ALL with overlap
-- [Rules: union-without-all, no-limit] [Features: hasUnion=1, tableCount=2]
SELECT name, email FROM customers WHERE state = 'SP' UNION SELECT name, email FROM customers WHERE city = 'Sao Paulo';

-- Q42: 6+ JOINs — too many joins
-- [Rules: too-many-joins, select-star-join, no-limit] [Features: selectStar=1, hasJoin=1, joinCount=6, nestedJoinDepth=3, tableCount=7]
SELECT * FROM orders o JOIN customers c ON o.customer_id = c.id JOIN order_items oi ON oi.order_id = o.id JOIN products p ON oi.product_id = p.id JOIN categories cat ON p.category_id = cat.id JOIN payments pay ON pay.order_id = o.id JOIN reviews r ON r.product_id = p.id;

-- Q43: DISTINCT + ORDER BY on large result
-- [Rules: distinct-order-by, no-limit] [Features: hasJoin=1, joinCount=1, tableCount=2, hasOrderBy=1]
SELECT DISTINCT p.name, p.price FROM products p JOIN order_items oi ON oi.product_id = p.id ORDER BY p.price DESC;

-- Q44: DELETE without WHERE
-- [Rules: no-where-mutation] [Features: tableCount=1]
DELETE FROM reviews;

-- Q45: LIKE leading wildcard + function in WHERE combo
-- [Rules: leading-wildcard, function-on-column, no-limit] [Features: hasLike=1, hasFunctionInWhere=1, tableCount=1]
SELECT id, name, email FROM customers WHERE LOWER(name) LIKE '%silva%';

-- Q46: Correlated subquery + no LIMIT + function in WHERE
-- [Rules: subquery-in-where, function-on-column, no-limit] [Features: hasSubquery=1, subqueryCount=1, hasFunctionInWhere=1, tableCount=2]
SELECT id, name, price FROM products WHERE price > (SELECT AVG(price) FROM products) AND YEAR(created_at) = 2024;

-- Q47: SELECT * with LIKE wildcard on non-indexed column
-- [Rules: leading-wildcard, no-limit] [Features: selectStar=1, hasLike=1, tableCount=1]
SELECT * FROM reviews WHERE title LIKE '%pessimo%';

-- Q48: Cartesian join via bad JOIN syntax (no ON)
-- [Rules: join-no-on, no-limit] [Features: hasJoin=1, joinCount=1, tableCount=2]
SELECT c.name, o.total_amount FROM customers c JOIN orders o LIMIT 100;

-- Q49: Massive aggregation — no WHERE, multiple JOINs, GROUP BY non-indexed
-- [Rules: no-limit] [Features: hasJoin=1, joinCount=3, nestedJoinDepth=2, tableCount=4, hasGroupBy=1, hasOrderBy=1]
SELECT c.state, cat.name, COUNT(o.id) AS order_count, SUM(oi.total_price) AS revenue FROM orders o JOIN customers c ON o.customer_id = c.id JOIN order_items oi ON oi.order_id = o.id JOIN products p ON oi.product_id = p.id JOIN categories cat ON p.category_id = cat.id GROUP BY c.state, cat.name ORDER BY revenue DESC;

-- Q50: Deeply nested + SELECT * + OR different columns
-- [Rules: deep-subquery, select-star-join, or-different-columns, no-limit] [Features: selectStar=1, hasSubquery=1, subqueryCount=2, hasOr=1, orConditionCount=1, hasJoin=1, joinCount=1, tableCount=3]
SELECT * FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.total_amount > 1000 OR c.state = 'RJ' AND o.id IN (SELECT order_id FROM order_items WHERE product_id IN (SELECT id FROM products WHERE price > 500));
