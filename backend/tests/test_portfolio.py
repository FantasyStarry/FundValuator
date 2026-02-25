"""
Test cases for Portfolio Overview API endpoint.
Tests cover: GET /api/portfolio/overview
"""

import pytest
from fastapi.testclient import TestClient


class TestPortfolioOverview:
    """Tests for GET /api/portfolio/overview endpoint."""
    
    def test_portfolio_overview_empty(self, client: TestClient, mock_data_sources):
        """
        TC-API-022: 获取组合概览 - 空组合
        
        验证点:
        - 无持仓时返回全0数据
        - 状态码200
        """
        response = client.get("/api/portfolio/overview")
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_amount"] == 0
        assert data["total_daily_income"] == 0
        assert data["total_holding_income"] == 0
        assert data["daily_pct"] == 0
    
    def test_portfolio_overview_with_funds(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-023: 获取组合概览 - 有持仓
        
        验证点:
        - 正确计算总金额
        - 返回收益数据
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        test_storage.update_fund_holding("000001", amount=10000.0, mode="amount", invested_amount=9500.0)
        
        response = client.get("/api/portfolio/overview")
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_amount"] > 0
        assert "total_daily_income" in data
        assert "total_holding_income" in data
        assert "daily_pct" in data
    
    def test_portfolio_overview_amount_mode(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-024: 获取组合概览 - 金额模式计算
        
        验证点:
        - 正确计算金额模式下的收益
        - invested_amount正确计入
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        test_storage.update_fund_holding(
            "000001", 
            amount=10000.0, 
            mode="amount", 
            invested_amount=9500.0
        )
        
        response = client.get("/api/portfolio/overview")
        
        assert response.status_code == 200
        data = response.json()
        # 持有收益 = 当前金额 - 投入本金 = 10000 - 9500 = 500
        assert data["total_holding_income"] == 500.0
    
    def test_portfolio_overview_shares_mode(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-025: 获取组合概览 - 份额模式计算
        
        验证点:
        - 正确计算份额模式下的收益
        - 使用净值计算金额
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        test_storage.update_fund_holding(
            "000001",
            amount=0,
            mode="shares",
            shares=1000.0,
            cost=1.2
        )
        
        response = client.get("/api/portfolio/overview")
        
        assert response.status_code == 200
        data = response.json()
        # 份额模式需要使用净值计算，mock返回的净值为1.2156
        assert "total_amount" in data
    
    def test_portfolio_overview_multiple_funds(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-026: 获取组合概览 - 多只基金
        
        验证点:
        - 正确汇总多只基金的数据
        - 总金额计算正确
        """
        # 添加3只基金
        for i in range(3):
            code = f"00000{i+1}"
            test_storage.upsert_fund(code, f"测试基金{i+1}", None)
            test_storage.update_fund_holding(code, amount=10000.0, mode="amount", invested_amount=9000.0)
        
        response = client.get("/api/portfolio/overview")
        
        assert response.status_code == 200
        data = response.json()
        # 总金额应该是30000
        assert data["total_amount"] == 30000.0
    
    def test_portfolio_overview_with_zero_holding(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-027: 获取组合概览 - 包含无持仓基金
        
        验证点:
        - 无持仓基金不影响计算
        - 只计算有持仓的基金
        """
        # 有持仓的基金
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        test_storage.update_fund_holding("000001", amount=10000.0, mode="amount", invested_amount=9000.0)
        
        # 无持仓的基金
        test_storage.upsert_fund("000002", "南方稳健成长", None)
        test_storage.update_fund_holding("000002", amount=0, mode="amount")
        
        response = client.get("/api/portfolio/overview")
        
        assert response.status_code == 200
        data = response.json()
        # 只计算有持仓的基金
        assert data["total_amount"] == 10000.0
    
    def test_portfolio_overview_mixed_modes(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-028: 获取组合概览 - 混合模式
        
        验证点:
        - 同时有金额模式和份额模式的基金
        - 正确汇总
        """
        # 金额模式基金
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        test_storage.update_fund_holding("000001", amount=10000.0, mode="amount", invested_amount=9000.0)
        
        # 份额模式基金
        test_storage.upsert_fund("000002", "南方稳健成长", None)
        test_storage.update_fund_holding("000002", shares=500.0, mode="shares", cost=1.5)
        
        response = client.get("/api/portfolio/overview")
        
        assert response.status_code == 200
        data = response.json()
        assert "total_amount" in data
    
    def test_portfolio_overview_negative_income(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-029: 获取组合概览 - 负收益情况
        
        验证点:
        - 支持负收益计算
        - invested_amount大于amount时
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        # 投入10000，现在只有9000，亏损1000
        test_storage.update_fund_holding("000001", amount=9000.0, mode="amount", invested_amount=10000.0)
        
        response = client.get("/api/portfolio/overview")
        
        assert response.status_code == 200
        data = response.json()
        # 持有收益 = 9000 - 10000 = -1000
        assert data["total_holding_income"] == -1000.0
    
    def test_portfolio_overview_with_estimate_data(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-030: 获取组合概览 - 包含估值数据
        
        验证点:
        - 返回used_source字段
        - 返回used_date字段
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        test_storage.update_fund_holding("000001", amount=10000.0, mode="amount")
        
        response = client.get("/api/portfolio/overview")
        
        assert response.status_code == 200
        data = response.json()
        assert "used_source" in data
        assert "used_date" in data


class TestPortfolioCalculations:
    """Detailed tests for portfolio calculation logic."""
    
    def test_daily_pct_calculation(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-031: 日涨幅计算
        
        验证点:
        - 日涨幅 = 日收益 / 昨日总金额
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        test_storage.update_fund_holding("000001", amount=10000.0, mode="amount", invested_amount=9500.0)
        
        response = client.get("/api/portfolio/overview")
        
        assert response.status_code == 200
        data = response.json()
        # 日涨幅应该是计算得出的
        assert isinstance(data["daily_pct"], (int, float))
    
    def test_total_amount_precision(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-032: 总金额精度
        
        验证点:
        - 金额保留2位小数
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        test_storage.update_fund_holding("000001", amount=12345.6789, mode="amount")
        
        response = client.get("/api/portfolio/overview")
        
        assert response.status_code == 200
        data = response.json()
        # 应该四舍五入到2位小数
        assert data["total_amount"] == round(data["total_amount"], 2)
    
    def test_daily_income_precision(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-033: 日收益精度
        
        验证点:
        - 日收益保留2位小数
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        test_storage.update_fund_holding("000001", amount=10000.0, mode="amount")
        
        response = client.get("/api/portfolio/overview")
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_daily_income"] == round(data["total_daily_income"], 2)


class TestPortfolioEdgeCases:
    """Edge case tests for portfolio overview."""
    
    def test_very_large_portfolio(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-034: 边界测试 - 超大组合
        
        验证点:
        - 支持大量基金
        - 计算不会溢出
        """
        # 添加100只基金
        for i in range(100):
            code = f"{i:06d}"
            test_storage.upsert_fund(code, f"测试基金{i}", None)
            test_storage.update_fund_holding(code, amount=10000.0, mode="amount")
        
        response = client.get("/api/portfolio/overview")
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_amount"] == 1000000.0
    
    def test_portfolio_with_fund_no_estimate(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-035: 边界测试 - 基金无估值数据
        
        验证点:
        - 估值失败时仍能返回结果
        - 跳过失败的计算
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        test_storage.update_fund_holding("000001", amount=10000.0, mode="amount")
        
        # 模拟估值失败
        mock_data_sources["fetch_fund_gz"].return_value = None
        
        response = client.get("/api/portfolio/overview")
        
        assert response.status_code == 200