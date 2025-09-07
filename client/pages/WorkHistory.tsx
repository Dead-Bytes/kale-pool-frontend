import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  HardHat, 
  Search, 
  Filter, 
  Download,
  RefreshCw,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { useFarmerSummary, useFarmerPlantings, useFarmerHarvests, useCurrentUser } from '@/hooks/use-api';
import { downloadWorkHistoryPDF } from '@/lib/pdf-generator';
import { useToast } from '@/hooks/use-toast';

// Work history data will be fetched from API
interface WorkHistoryItem {
  id: string;
  blockIndex: number;
  status: 'success' | 'failed' | 'pending';
  amount: string;
  timestamp: string;
  poolerId: string;
  poolerName: string;
  type: 'planting' | 'harvest';
  transactionHash?: string;
}

interface WorkStats {
  totalSubmissions: number;
  successRate: number;
  avgProcessingTime: number;
  totalRewards: number;
  activePools: number;
  peakHour: string;
  topFarmer: string;
}

interface FarmerStats {
  farmerId: string;
  submissions: number;
  successRate: number;
  totalRewards: number;
}

export default function WorkHistory() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('7d');
  const [workHistory, setWorkHistory] = useState<WorkHistoryItem[]>([]);
  const [farmerStats, setFarmerStats] = useState<FarmerStats[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Check if farmer ID exists in local storage
  const farmerId = localStorage.getItem('kale-pool-farmer-id');
  const hasFarmerId = !!farmerId;

  // API hooks - only call when farmer ID exists
  const { 
    data: farmerSummary, 
    isLoading: summaryLoading, 
    error: summaryError,
    refetch: refetchSummary 
  } = useFarmerSummary(farmerId || undefined, timeRange as '24h' | '7d' | '30d' | 'all');

  // Get user data for email
  const { 
    data: userData, 
    isLoading: userLoading, 
    error: userError 
  } = useCurrentUser();

  // Convert timeRange to date filters
  const getDateRange = (range: string) => {
    const now = new Date();
    const to = now.toISOString();
    
    switch (range) {
      case '24h':
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return { from: dayAgo.toISOString(), to };
      case '7d':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { from: weekAgo.toISOString(), to };
      case '30d':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { from: monthAgo.toISOString(), to };
      case '90d':
        const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        return { from: quarterAgo.toISOString(), to };
      default:
        return undefined;
    }
  };

  const dateRange = getDateRange(timeRange);

  const { 
    data: plantingsData, 
    isLoading: plantingsLoading, 
    error: plantingsError,
    refetch: refetchPlantings 
  } = useFarmerPlantings(farmerId || undefined, {
    status: statusFilter === 'all' ? undefined : statusFilter as 'success' | 'failed',
    from: dateRange?.from,
    to: dateRange?.to,
    page: 1,
    limit: 100
  });

  const { 
    data: harvestsData, 
    isLoading: harvestsLoading, 
    error: harvestsError,
    refetch: refetchHarvests 
  } = useFarmerHarvests(farmerId || undefined, {
    status: statusFilter === 'all' ? undefined : statusFilter as 'success' | 'failed',
    from: dateRange?.from,
    to: dateRange?.to,
    page: 1,
    limit: 100
  });

  const isLoading = summaryLoading || plantingsLoading || harvestsLoading || userLoading;
  const hasError = summaryError || plantingsError || harvestsError || userError;

  // Debug logging for data structure issues
  useEffect(() => {
    if (farmerSummary) {
      console.log('Farmer Summary Data:', farmerSummary);
    }
    if (plantingsData) {
      console.log('Plantings Data:', plantingsData);
    }
    if (harvestsData) {
      console.log('Harvests Data:', harvestsData);
    }
    if (userData) {
      console.log('User Data:', userData);
    }
  }, [farmerSummary, plantingsData, harvestsData, userData]);

  const handleExport = async () => {
    if (!workHistory.length) {
      toast({
        title: "No Data Available",
        description: "No work history data available to export.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingPDF(true);
    try {
      const farmerEmail = userData?.user?.email || undefined;
      await downloadWorkHistoryPDF(workHistory, farmerEmail, timeRange);
      toast({
        title: "PDF Generated",
        description: "Work history report has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleRefresh = () => {
    refetchSummary();
    refetchPlantings();
    refetchHarvests();
  };

  // Process data from APIs
  useEffect(() => {
    if (plantingsData && harvestsData) {
      // Combine plantings and harvests data for work history
      const combinedHistory: WorkHistoryItem[] = [];
      
      // Add plantings as work submissions
      if (plantingsData.items && Array.isArray(plantingsData.items)) {
        plantingsData.items.forEach((planting: any) => {
          if (planting && planting.id) {
            combinedHistory.push({
              id: planting.id,
              blockIndex: planting.blockIndex || 0,
              status: planting.status === 'success' ? 'success' : 'failed',
              amount: planting.stakeAmount || '0',
              timestamp: planting.plantedAt || new Date().toISOString(),
              poolerId: planting.poolerId || 'unknown',
              poolerName: planting.poolerName || 'Unknown Pooler',
              type: 'planting',
              transactionHash: planting.transactionHash || ''
            });
          }
        });
      }

      // Add harvests as work completions
      if (harvestsData.items && Array.isArray(harvestsData.items)) {
        harvestsData.items.forEach((harvest: any) => {
          if (harvest && harvest.id) {
            combinedHistory.push({
              id: harvest.id,
              blockIndex: harvest.blockIndex || 0,
              status: harvest.status === 'success' ? 'success' : 'failed',
              amount: harvest.rewardAmountHuman || '0',
              timestamp: harvest.harvestedAt || new Date().toISOString(),
              poolerId: harvest.poolerId || 'unknown',
              poolerName: harvest.poolerName || 'Unknown Pooler',
              type: 'harvest',
              transactionHash: harvest.transactionHash || ''
            });
          }
        });
      }

      // Sort by timestamp (newest first)
      combinedHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setWorkHistory(combinedHistory);
    }
  }, [plantingsData, harvestsData]);

  const filteredWorkHistory = workHistory
    .filter(work => {
    const matchesSearch = work.blockIndex.toString().includes(searchTerm) ||
                         work.poolerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         work.poolerId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || work.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Work History</h1>
          <p className="text-muted-foreground mt-1">
            Historical work submission data and performance analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Submissions</p>
                <p className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : 
                   (farmerSummary?.lifetime?.blocksParticipated || workHistory.length).toLocaleString()}
                </p>
              </div>
              <HardHat className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : 
                   `${Math.round((farmerSummary?.lifetime?.successRate || 0) * 100)}%`}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Rewards</p>
                <p className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-20" /> : 
                   (farmerSummary?.lifetime?.totalRewardsHuman || '0')}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Pools</p>
                <p className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : 
                   farmerSummary?.contract ? 1 : 0}
                </p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by farmer ID, block, or nonce..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Time Range</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {!hasFarmerId && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div>
              <p>No farmer account found. Please complete your farmer registration first.</p>
              <p className="text-sm mt-1">You need to register as a farmer to view work history data.</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {hasError && hasFarmerId && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div>
              <p>Failed to load work history data. Please try refreshing the page.</p>
              {summaryError && <p className="text-sm mt-1">Summary Error: {summaryError.message}</p>}
              {plantingsError && <p className="text-sm mt-1">Plantings Error: {plantingsError.message}</p>}
              {harvestsError && <p className="text-sm mt-1">Harvests Error: {harvestsError.message}</p>}
              {userError && <p className="text-sm mt-1">User Error: {userError.message}</p>}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history">Work History</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Work Submissions</CardTitle>
              <CardDescription>
                Detailed history of work submissions with filtering and search
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Block Index</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Pooler</TableHead>
                      <TableHead>Transaction</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index}>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredWorkHistory.length > 0 ? (
                      filteredWorkHistory.map((work) => (
                        <TableRow key={work.id}>
                          <TableCell className="font-mono">{work.blockIndex}</TableCell>
                          <TableCell>
                            <Badge variant={work.type === 'planting' ? 'secondary' : 'default'}>
                              {work.type === 'planting' ? 'Planting' : 'Harvest'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={work.status === 'success' ? 'default' : 'destructive'}>
                              {work.status === 'success' ? (
                                <CheckCircle className="w-3 h-3 mr-1" />
                              ) : (
                                <XCircle className="w-3 h-3 mr-1" />
                              )}
                              {work.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">
                            {work.amount}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{work.poolerName}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {work.transactionHash ? `${work.transactionHash.slice(0, 8)}...` : 'N/A'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(work.timestamp).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <HardHat className="w-8 h-8 text-muted-foreground" />
                            <p className="text-muted-foreground">No work history found</p>
                            <p className="text-sm text-muted-foreground">
                              Work submissions will appear here once you start participating in pools
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate Reports</CardTitle>
              <CardDescription>
                Generate comprehensive work history reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-md">
                <div className="p-6 border rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <h3 className="font-medium">Work History Report</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate a comprehensive report of all work submissions for the selected time period.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExport}
                    disabled={isGeneratingPDF || !workHistory.length}
                  >
                    {isGeneratingPDF ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    {isGeneratingPDF ? 'Generating...' : 'Generate PDF'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
