-- HU-2 Catálogo de servicios. Por ahora solo las columnas que lee HU-1; el responsable de HU-2 completa el resto.

CREATE TABLE categorias (
  id VARCHAR(10) PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  prioridad_por_defecto VARCHAR(10) NULL,
  tiempo_esperado_horas SMALLINT UNSIGNED NULL
);

CREATE TABLE subcategorias (
  id VARCHAR(10) PRIMARY KEY,
  categoria_id VARCHAR(10) NOT NULL,
  nombre VARCHAR(80) NOT NULL,
  descripcion VARCHAR(300) NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  prioridad_por_defecto VARCHAR(10) NULL,
  tiempo_esperado_horas SMALLINT UNSIGNED NULL,
  CONSTRAINT fk_subcategorias_categoria FOREIGN KEY (categoria_id) REFERENCES categorias (id)
);

CREATE TABLE ambientes (
  id VARCHAR(10) PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(80) NOT NULL
);
