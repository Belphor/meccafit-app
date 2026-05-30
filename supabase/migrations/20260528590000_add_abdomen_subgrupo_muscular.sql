-- FENYXIA · subgrupo_muscular — valor abdomen (Core IRIS)
-- OBRIGATÓRIO correr numa query SEPARADA antes de 20260529000000_split_workout_architecture.sql
-- PostgreSQL: novo valor de enum só pode ser usado após COMMIT desta instrução.

ALTER TYPE public.subgrupo_muscular ADD VALUE IF NOT EXISTS 'abdomen';
