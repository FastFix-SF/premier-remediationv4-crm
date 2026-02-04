import React from 'react';
import RoofingFriendHeader from '../components/RoofingFriendHeader';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import { Shield, Award, Users, Clock, Phone, Mail, CheckCircle } from 'lucide-react';
import { useBusiness } from '@/hooks/useBusinessConfig';

const About = () => {
  const business = useBusiness();

  // Calculate years in business
  const yearsInBusiness = business.yearsInBusiness ||
    (business.foundedYear ? new Date().getFullYear() - business.foundedYear : null);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`About ${business.name} | Our Story`}
        description={`Learn about ${business.name}. ${business.tagline || 'Your trusted service provider.'}`}
      />
      <RoofingFriendHeader />

      <main className="py-8 sm:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-12 lg:mb-16">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
              About {business.name}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              {business.description || business.tagline || 'Your trusted service provider.'}
            </p>
          </div>

          {/* Company Story */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 mb-16">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">Our Story</h2>
              <div className="space-y-4 text-muted-foreground">
                {yearsInBusiness ? (
                  <p>
                    {business.foundedYear ? `Founded in ${business.foundedYear}, ` : ''}
                    {business.name} has been serving our community
                    {yearsInBusiness > 0 ? ` for over ${yearsInBusiness} years` : ''}.
                    We started with a simple mission: provide exceptional service with unmatched customer care.
                  </p>
                ) : (
                  <p>
                    {business.name} is dedicated to providing exceptional service
                    with unmatched customer care. Our mission is to deliver quality results
                    that exceed expectations.
                  </p>
                )}
                <p>
                  Our team combines experience with modern techniques to deliver
                  solutions that protect your investment for years to come. We take pride
                  in every project, regardless of size.
                </p>
                <p>
                  What sets us apart is our commitment to quality, transparency, and customer
                  satisfaction. Every project receives our full attention and expertise.
                </p>
                {business.certifications && business.certifications.length > 0 && (
                  <div className="pt-4">
                    <p className="font-medium text-foreground mb-2">Our Credentials:</p>
                    <div className="flex flex-wrap gap-2">
                      {business.certifications.map((cert, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 bg-primary/10 text-primary text-sm px-3 py-1 rounded-full"
                        >
                          <CheckCircle className="w-3 h-3" />
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl p-8 h-full flex items-center justify-center">
              <div className="text-center">
                <Shield className="w-20 h-20 text-primary mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-foreground mb-2">{business.name}</h3>
                <p className="text-muted-foreground">{business.tagline}</p>
                {yearsInBusiness && yearsInBusiness > 0 && (
                  <p className="text-sm text-primary mt-2">{yearsInBusiness}+ Years of Experience</p>
                )}
              </div>
            </div>
          </div>

          {/* Values */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {business.uniqueSellingPoints && business.uniqueSellingPoints.length > 0 ? (
              business.uniqueSellingPoints.slice(0, 4).map((usp, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    {index === 0 && <Shield className="w-8 h-8 text-primary" />}
                    {index === 1 && <Award className="w-8 h-8 text-primary" />}
                    {index === 2 && <Users className="w-8 h-8 text-primary" />}
                    {index === 3 && <Clock className="w-8 h-8 text-primary" />}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{usp}</h3>
                </div>
              ))
            ) : (
              <>
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {business.certifications?.includes('Licensed') ? 'Licensed & Insured' : 'Quality Service'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Professional service you can trust for your peace of mind.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Quality Guaranteed</h3>
                  <p className="text-sm text-muted-foreground">
                    We stand behind our work with comprehensive guarantees.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Expert Team</h3>
                  <p className="text-sm text-muted-foreground">
                    Experienced professionals dedicated to delivering exceptional results.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Fast Response</h3>
                  <p className="text-sm text-muted-foreground">
                    Quick estimates and efficient service to get your project started.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Contact CTA */}
          <div className="bg-primary/5 rounded-2xl p-8 sm:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Ready to Work With Us?
            </h2>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              Contact us today for a free consultation and discover why customers choose {business.name}.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {business.phone && (
                <a
                  href={`tel:${business.phoneRaw || business.phone.replace(/\D/g, '')}`}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  {business.phone}
                </a>
              )}
              {business.email && (
                <a
                  href={`mailto:${business.email}`}
                  className="inline-flex items-center gap-2 border border-primary text-primary px-6 py-3 rounded-lg font-semibold hover:bg-primary/10 transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  {business.email}
                </a>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;
