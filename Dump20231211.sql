-- MySQL dump 10.13  Distrib 8.0.33, for Win64 (x86_64)
--
-- Host: 3.36.199.180    Database: system_trading
-- ------------------------------------------------------
-- Server version	8.0.35

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `balance`
--

DROP TABLE IF EXISTS `balance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `balance` (
  `exchange` char(20) DEFAULT NULL,
  `asset_type` varchar(10) DEFAULT 'coin',
  `name` char(10) DEFAULT NULL,
  `current_price` float DEFAULT NULL,
  `amount` double DEFAULT NULL,
  `avg_buy_price` float DEFAULT NULL,
  `uuid` char(50) DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `strategy_name` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `balance`
--

LOCK TABLES `balance` WRITE;
/*!40000 ALTER TABLE `balance` DISABLE KEYS */;
INSERT INTO `balance` VALUES ('bank','KRW','KRW',NULL,3659839,NULL,NULL,1,NULL),('bank','KRW','KRW',NULL,3107946,NULL,NULL,2,NULL),('upbit','KRW','KRW',NULL,5217258,NULL,NULL,1,NULL),('upbit','KRW','KRW',NULL,3790638,NULL,NULL,2,NULL),('bithumb','KRW','KRW',NULL,2703868,NULL,NULL,1,NULL),('bithumb','KRW','KRW',NULL,2296132,NULL,NULL,2,NULL),(NULL,'coin',NULL,3060000,1,2566000,'b46fe1bc-ecde-43bb-b856-3c84959ed2f8',NULL,NULL);
/*!40000 ALTER TABLE `balance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dw`
--

DROP TABLE IF EXISTS `dw`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dw` (
  `seq` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `exchange` char(20) DEFAULT NULL,
  `time` char(10) DEFAULT NULL,
  `type` varchar(10) DEFAULT NULL,
  `balance` int DEFAULT NULL,
  PRIMARY KEY (`seq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dw`
--

LOCK TABLES `dw` WRITE;
/*!40000 ALTER TABLE `dw` DISABLE KEYS */;
/*!40000 ALTER TABLE `dw` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exchange`
--

DROP TABLE IF EXISTS `exchange`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exchange` (
  `exchange` char(20) NOT NULL,
  `fee` float DEFAULT NULL,
  PRIMARY KEY (`exchange`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exchange`
--

LOCK TABLES `exchange` WRITE;
/*!40000 ALTER TABLE `exchange` DISABLE KEYS */;
INSERT INTO `exchange` VALUES ('bithumb',0.0025),('upbit',0.05);
/*!40000 ALTER TABLE `exchange` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `strategy`
--

DROP TABLE IF EXISTS `strategy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `strategy` (
  `strategy_name` varchar(20) DEFAULT NULL,
  `explanation` varchar(100) DEFAULT NULL,
  `exchange` varchar(20) DEFAULT NULL,
  `target_coin` varchar(10) DEFAULT NULL,
  `status` varchar(10) DEFAULT NULL,
  `risk` varchar(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `strategy`
--

LOCK TABLES `strategy` WRITE;
/*!40000 ALTER TABLE `strategy` DISABLE KEYS */;
INSERT INTO `strategy` VALUES ('ma_eth','이동평균선을 조합해 돌파시 매매','upbit','ETH','ready','mlddle'),('super_trend','수퍼트렌드 지표를 이용해 매매','bithumb','ETH','running','middle');
/*!40000 ALTER TABLE `strategy` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trade_log`
--

DROP TABLE IF EXISTS `trade_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trade_log` (
  `uuid` char(50) NOT NULL,
  `exchange` char(20) DEFAULT NULL,
  `time` char(10) DEFAULT NULL,
  `trade` char(5) DEFAULT NULL,
  `coin_name` varchar(10) DEFAULT NULL,
  `avg_price` float DEFAULT NULL,
  `amount` double DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `strategy_name` varchar(20) DEFAULT NULL,
  `status` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trade_log`
--

LOCK TABLES `trade_log` WRITE;
/*!40000 ALTER TABLE `trade_log` DISABLE KEYS */;
INSERT INTO `trade_log` VALUES ('b46fe1bc-ecde-43bb-b856-3c84959ed2f8','upbit','2021-03-21','buy','ETH',2566000,1,1,'ma_eth','done');
/*!40000 ALTER TABLE `trade_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `use_strategy_list`
--

DROP TABLE IF EXISTS `use_strategy_list`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `use_strategy_list` (
  `seq` int NOT NULL AUTO_INCREMENT,
  `strategy_name` varchar(20) NOT NULL,
  `user_id` int NOT NULL,
  `balance` int NOT NULL,
  `order_type` varchar(10) DEFAULT 'market',
  PRIMARY KEY (`seq`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `use_strategy_list`
--

LOCK TABLES `use_strategy_list` WRITE;
/*!40000 ALTER TABLE `use_strategy_list` DISABLE KEYS */;
INSERT INTO `use_strategy_list` VALUES (1,'ma_eth',1,5217258,'limit'),(2,'ma_eth',2,3790638,'limit'),(3,'super_trend',1,2703868,'limit'),(4,'super_trend',2,2296132,'limit'),(5,'test',2,1234,'limit');
/*!40000 ALTER TABLE `use_strategy_list` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `user_id` int NOT NULL,
  `name` varchar(20) NOT NULL,
  `bank` varchar(20) NOT NULL,
  `account_number` varchar(45) NOT NULL,
  `phone_number` varchar(45) NOT NULL,
  `fee` float DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `user_id_UNIQUE` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (1,'김범진','케이뱅크','100151800280','01093701566',0),(2,'김기성','-','0','01082071566',0);
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'system_trading'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-12-11 23:24:59
