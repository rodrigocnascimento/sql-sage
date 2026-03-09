-- ============================================================
-- E-commerce Demo Schema for sql-ml-cli
-- Database: ecommerce_demo
-- Purpose: Realistic schema with strategic index placement
--          to demonstrate ML-based SQL performance analysis.
--
-- Index strategy:
--   - Most foreign keys and common filter columns are indexed
--   - Intentional gaps: products.name, reviews.rating,
--     orders.total_amount, customers.phone — these force full
--     scans that the analyzer should detect.
-- ============================================================

USE ecommerce_demo;

-- -----------------------------------------------------------
-- 1. categories
-- -----------------------------------------------------------
CREATE TABLE categories (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100)    NOT NULL,
  slug        VARCHAR(120)    NOT NULL,
  parent_id   INT UNSIGNED    DEFAULT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug),
  KEY idx_categories_parent (parent_id),
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 2. products
-- -----------------------------------------------------------
CREATE TABLE products (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name            VARCHAR(255)    NOT NULL,
  slug            VARCHAR(280)    NOT NULL,
  description     TEXT,
  category_id     INT UNSIGNED    NOT NULL,
  price           DECIMAL(10,2)   NOT NULL,
  stock_quantity  INT UNSIGNED    NOT NULL DEFAULT 0,
  is_active       TINYINT(1)      NOT NULL DEFAULT 1,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_slug (slug),
  KEY idx_products_category (category_id),
  KEY idx_products_price (price),
  KEY idx_products_active_created (is_active, created_at),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- NOTE: No index on `name` or `stock_quantity` — intentional for demo.

-- -----------------------------------------------------------
-- 3. customers
-- -----------------------------------------------------------
CREATE TABLE customers (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name        VARCHAR(150)    NOT NULL,
  email       VARCHAR(255)    NOT NULL,
  phone       VARCHAR(20)     DEFAULT NULL,
  city        VARCHAR(100)    NOT NULL,
  state       CHAR(2)         NOT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customers_email (email),
  KEY idx_customers_state_city (state, city),
  KEY idx_customers_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- NOTE: No index on `name` or `phone` — intentional for demo.

-- -----------------------------------------------------------
-- 4. orders
-- -----------------------------------------------------------
CREATE TABLE orders (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  customer_id     INT UNSIGNED    NOT NULL,
  status          ENUM('pending','processing','shipped','completed','cancelled') NOT NULL DEFAULT 'pending',
  total_amount    DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  items_count     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_orders_customer_created (customer_id, created_at),
  KEY idx_orders_status_created (status, created_at),
  KEY idx_orders_created (created_at),
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- NOTE: No index on `total_amount` — intentional for demo.

-- -----------------------------------------------------------
-- 5. order_items
-- -----------------------------------------------------------
CREATE TABLE order_items (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  order_id    INT UNSIGNED    NOT NULL,
  product_id  INT UNSIGNED    NOT NULL,
  quantity    SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  unit_price  DECIMAL(10,2)   NOT NULL,
  total_price DECIMAL(12,2)   NOT NULL,
  PRIMARY KEY (id),
  KEY idx_order_items_order (order_id),
  KEY idx_order_items_product (product_id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 6. payments
-- -----------------------------------------------------------
CREATE TABLE payments (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  order_id    INT UNSIGNED    NOT NULL,
  method      ENUM('credit_card','debit_card','pix','boleto') NOT NULL,
  amount      DECIMAL(12,2)   NOT NULL,
  status      ENUM('pending','approved','rejected','refunded') NOT NULL DEFAULT 'pending',
  paid_at     DATETIME        DEFAULT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payments_order (order_id),
  KEY idx_payments_method_status (method, status),
  KEY idx_payments_paid_at (paid_at),
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 7. reviews
-- -----------------------------------------------------------
CREATE TABLE reviews (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  product_id  INT UNSIGNED    NOT NULL,
  customer_id INT UNSIGNED    NOT NULL,
  rating      TINYINT UNSIGNED NOT NULL,
  title       VARCHAR(200)    DEFAULT NULL,
  comment     TEXT,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reviews_product_created (product_id, created_at),
  KEY idx_reviews_customer (customer_id),
  CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- NOTE: No index on `rating` or `title` — intentional for demo.
