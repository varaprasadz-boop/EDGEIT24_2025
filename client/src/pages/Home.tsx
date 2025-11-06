import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  Users,
  Code,
  Megaphone,
  HardDrive,
  CheckCircle2,
  Upload,
  MessageSquare,
  Star,
  ArrowRight,
  TrendingUp,
  Shield,
  Clock,
  Zap
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-b from-[#0A0E27] via-[#0D1421] to-background py-20 md:py-32">
          <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
          <div className="container mx-auto px-4 md:px-6 relative">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" data-testid="badge-hero">
                B2B IT Marketplace
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight" data-testid="text-hero-title">
                Connect with Top IT Experts
              </h1>
              <p className="text-xl md:text-2xl text-white/60 max-w-2xl mx-auto" data-testid="text-hero-subtitle">
                Post Requirements • Receive Competitive Bids • Get Your IT Projects Done
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button size="lg" asChild className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg" data-testid="button-hero-client">
                  <Link href="/post-requirement">
                    I Need IT Services
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="border-white/20 text-white hover:bg-white/10 text-lg" data-testid="button-hero-vendor">
                  <Link href="/signup-vendor">
                    I'm a Service Provider
                  </Link>
                </Button>
              </div>
              <div className="flex flex-wrap justify-center gap-6 md:gap-12 pt-8 text-white/60">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-sm" data-testid="text-trust-companies">Trusted by 500+ Companies</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-sm" data-testid="text-trust-experts">1000+ IT Experts</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-sm" data-testid="text-trust-success">98% Success Rate</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-how-title">How It Works</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Simple, transparent process to connect with the right IT professionals
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <Card className="text-center hover-elevate" data-testid="card-step-1">
                <CardHeader>
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>1. Post Your Requirement</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Describe your IT project needs, budget, and timeline. Our platform guides you through the process.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center hover-elevate" data-testid="card-step-2">
                <CardHeader>
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <MessageSquare className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>2. Review Competitive Bids</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Receive proposals from qualified vendors. Compare pricing, timelines, and expertise.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center hover-elevate" data-testid="card-step-3">
                <CardHeader>
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>3. Award & Deliver</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Select the best vendor, collaborate seamlessly, and get your project completed successfully.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-services-title">IT Services We Offer</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Comprehensive IT solutions across all major technology domains
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              <Card className="group hover-elevate cursor-pointer" data-testid="card-service-human">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Human Resources</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    IT consultants, developers, designers, and project managers on demand.
                  </CardDescription>
                  <Button variant="link" className="p-0 mt-4 text-primary" data-testid="button-explore-human">
                    Explore <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="group hover-elevate cursor-pointer" data-testid="card-service-software">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Code className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Software Services</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Custom software development, ERP implementation, and SaaS solutions.
                  </CardDescription>
                  <Button variant="link" className="p-0 mt-4 text-primary" data-testid="button-explore-software">
                    Explore <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="group hover-elevate cursor-pointer" data-testid="card-service-marketing">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Megaphone className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Digital Marketing</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    SEO, PPC, content marketing, and social media management services.
                  </CardDescription>
                  <Button variant="link" className="p-0 mt-4 text-primary" data-testid="button-explore-marketing">
                    Explore <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="group hover-elevate cursor-pointer" data-testid="card-service-hardware">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <HardDrive className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Hardware Supply</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Servers, networking equipment, workstations, and IT infrastructure.
                  </CardDescription>
                  <Button variant="link" className="p-0 mt-4 text-primary" data-testid="button-explore-hardware">
                    Explore <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-vendors-title">Top-Rated Service Providers</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Connect with experienced professionals who deliver excellence
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {[
                { name: "Sarah Johnson", title: "Full Stack Developer", rating: 5.0, skills: ["React", "Node.js", "AWS"], projects: 45 },
                { name: "Michael Chen", title: "Cloud Architect", rating: 4.9, skills: ["Azure", "DevOps", "Kubernetes"], projects: 38 },
                { name: "Emily Davis", title: "UI/UX Designer", rating: 5.0, skills: ["Figma", "Design Systems", "Mobile"], projects: 52 }
              ].map((vendor, idx) => (
                <Card key={idx} className="hover-elevate" data-testid={`card-vendor-${idx}`}>
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${vendor.name}`} />
                        <AvatarFallback>{vendor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{vendor.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{vendor.title}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-4 w-4 fill-primary text-primary" />
                          <span className="text-sm font-medium" data-testid={`text-rating-${idx}`}>{vendor.rating}</span>
                          <span className="text-sm text-muted-foreground">({vendor.projects} projects)</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {vendor.skills.map((skill, skillIdx) => (
                        <Badge key={skillIdx} variant="secondary" className="text-xs" data-testid={`badge-skill-${idx}-${skillIdx}`}>
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    <Button className="w-full mt-4" variant="outline" data-testid={`button-view-profile-${idx}`}>
                      View Profile
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="text-center mt-8">
              <Button size="lg" variant="outline" data-testid="button-view-all-vendors">
                View All Service Providers <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        <section className="py-20 bg-primary/5">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto text-center">
              <div data-testid="stat-projects">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  <div className="text-4xl font-bold text-primary">5000+</div>
                </div>
                <p className="text-muted-foreground">Projects Completed</p>
              </div>
              <div data-testid="stat-vendors">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users className="h-6 w-6 text-primary" />
                  <div className="text-4xl font-bold text-primary">1200+</div>
                </div>
                <p className="text-muted-foreground">Active Vendors</p>
              </div>
              <div data-testid="stat-success">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Shield className="h-6 w-6 text-primary" />
                  <div className="text-4xl font-bold text-primary">98%</div>
                </div>
                <p className="text-muted-foreground">Success Rate</p>
              </div>
              <div data-testid="stat-transactions">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap className="h-6 w-6 text-primary" />
                  <div className="text-4xl font-bold text-primary">$2M+</div>
                </div>
                <p className="text-muted-foreground">Total Transactions</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-testimonials-title">What Our Clients Say</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Trusted by businesses worldwide for quality IT solutions
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {[
                {
                  quote: "EDGEIT24 helped us find the perfect development team. The bidding process was transparent and we got excellent value.",
                  author: "John Smith",
                  role: "CTO, TechCorp",
                  rating: 5
                },
                {
                  quote: "As a vendor, this platform has been instrumental in growing my business. The quality of clients is exceptional.",
                  author: "Maria Garcia",
                  role: "Founder, DevSolutions",
                  rating: 5
                },
                {
                  quote: "Quick, efficient, and reliable. We've completed over 20 projects through EDGEIT24 with outstanding results.",
                  author: "David Lee",
                  role: "Project Manager, InnovateLabs",
                  rating: 5
                }
              ].map((testimonial, idx) => (
                <Card key={idx} className="hover-elevate" data-testid={`card-testimonial-${idx}`}>
                  <CardHeader>
                    <div className="flex gap-1 mb-2">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <CardDescription className="text-base italic">
                      "{testimonial.quote}"
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${testimonial.author}`} />
                        <AvatarFallback>{testimonial.author.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{testimonial.author}</p>
                        <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-gradient-to-b from-[#0A0E27] to-[#0D1421] text-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold" data-testid="text-cta-title">
                Ready to Start Your Next IT Project?
              </h2>
              <p className="text-xl text-white/60">
                Join thousands of satisfied clients and vendors on EDGEIT24
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button size="lg" asChild className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg" data-testid="button-cta-post">
                  <Link href="/post-requirement">
                    Post Your Requirement Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="border-white/20 text-white hover:bg-white/10 text-lg" data-testid="button-cta-browse">
                  <Link href="/browse">
                    Browse Available Projects
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
