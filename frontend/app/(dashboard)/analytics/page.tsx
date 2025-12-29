/**
 * Analytics Jobs List Page V2
 * Main page for viewing and managing sales analytics
 * Updated with Design System V2
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { useAnalytics } from '@/hooks/useAnalytics'
import { AnalysisJob, AnalysisStatus } from '@/types/analytics'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Card,
  Badge,
  Separator,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui-v2'
import { PageLayout } from '@/components/layouts'
import { Icon } from '@/components/icons'

const STATUS_CONFIG = {
  [AnalysisStatus.PENDING]: {
    label: 'Pending',
    className: 'bg-gray-100 text-gray-700',
  },
  [AnalysisStatus.PROCESSING]: {
    label: 'Processing',
    className: 'bg-blue-100 text-blue-700',
  },
  [AnalysisStatus.COMPLETED]: {
    label: 'Completed',
    className: 'bg-green-100 text-green-700',
  },
  [AnalysisStatus.FAILED]: {
    label: 'Failed',
    className: 'bg-red-100 text-red-700',
  },
}

export default function AnalyticsPage() {
  const router = useRouter()
  const { jobs, isLoading, pagination, fetchJobs, deleteJob } = useAnalytics()
  const [statusFilter, setStatusFilter] = useState<AnalysisStatus | 'ALL'>('ALL')

  useEffect(() => {
    fetchJobs({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      page: 1,
      page_size: 10,
    })
  }, [statusFilter, fetchJobs])

  const handleDelete = async (jobId: string) => {
    await deleteJob(jobId)
  }

  const handlePageChange = (newPage: number) => {
    fetchJobs({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      page: newPage,
      page_size: 10,
    })
  }

  return (
    <PageLayout
      title="Sales Analytics"
      description="ABC analysis and sales performance insights"
      actions={
        <Link href="/analytics/upload">
          <Button size="lg" leftIcon={<Icon name="upload" />}>
            New Analysis
          </Button>
        </Link>
      }
    >
      <Separator />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <Icon name="description" className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Analyses
              </p>
              <p className="text-2xl font-bold">{pagination.total}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100">
              <Icon name="bar_chart" className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Completed
              </p>
              <p className="text-2xl font-bold">
                {jobs.filter((j) => j.status === AnalysisStatus.COMPLETED).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-100">
              <Icon name="trending_up" className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Processing
              </p>
              <p className="text-2xl font-bold">
                {jobs.filter((j) => j.status === AnalysisStatus.PROCESSING).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <Icon name="event" className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                This Month
              </p>
              <p className="text-2xl font-bold">
                {
                  jobs.filter((j) => {
                    const jobDate = new Date(j.created_at)
                    const now = new Date()
                    return (
                      jobDate.getMonth() === now.getMonth() &&
                      jobDate.getFullYear() === now.getFullYear()
                    )
                  }).length
                }
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Jobs List */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Analysis Jobs</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Filter by status:</span>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as AnalysisStatus | 'ALL')
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value={AnalysisStatus.PENDING}>Pending</SelectItem>
                  <SelectItem value={AnalysisStatus.PROCESSING}>
                    Processing
                  </SelectItem>
                  <SelectItem value={AnalysisStatus.COMPLETED}>
                    Completed
                  </SelectItem>
                  <SelectItem value={AnalysisStatus.FAILED}>Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading && jobs.length === 0 ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="description" className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No analysis jobs found
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Upload a sales file to start analyzing your data
              </p>
              <Link href="/analytics/upload">
                <Button leftIcon={<Icon name="upload" />}>
                  Upload Sales Data
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Total Sales</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Icon name="description" className="h-4 w-4 text-green-600" />
                            <span className="truncate max-w-xs">
                              {job.file_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_CONFIG[job.status].className}>
                            {STATUS_CONFIG[job.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {job.results?.summary.unique_products?.toLocaleString() ||
                            '-'}
                        </TableCell>
                        <TableCell>
                          {job.results?.summary.total_sales
                            ? `$${job.results.summary.total_sales.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {format(new Date(job.created_at), 'MMM dd, HH:mm')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {job.status === AnalysisStatus.COMPLETED && (
                              <Link href={`/analytics/${job.id}`}>
                                <Button variant="ghost" size="sm">
                                  <Icon name="visibility" className="h-4 w-4" />
                                </Button>
                              </Link>
                            )}

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Icon name="delete" className="h-4 w-4 text-red-600" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete Analysis Job
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this analysis job?
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(job.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing page {pagination.page} of {pagination.totalPages} (
                    {pagination.total} total jobs)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </PageLayout>
  )
}
